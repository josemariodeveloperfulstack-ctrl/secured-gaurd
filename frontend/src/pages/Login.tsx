import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertTriangle, User, Shield } from 'lucide-react';
import SEO from '@/components/SEO';
import Logo from '../components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGSAP } from '@/hooks/use-gsap';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  useGSAP();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const { toast } = useToast();
  
  // Estados para Funcionário (aba atual)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Estados para Supervisor
  const [supervisorCpf, setSupervisorCpf] = useState('');
  const [supervisorLoading, setSupervisorLoading] = useState(false);
  const [supervisorError, setSupervisorError] = useState('');
  const [needsConsent, setNeedsConsent] = useState(false);
  const [supervisorData, setSupervisorData] = useState<any>(null);

  // Debug logs para mobile
  useEffect(() => {
    console.log('🔍 Login component mounted');
    console.log('🔍 User state:', user);
    console.log('🔍 Screen size:', window.innerWidth, 'x', window.innerHeight);
    console.log('🔍 Is mobile:', window.innerWidth < 768);
    console.log('🔍 User agent:', navigator.userAgent);
    console.log('🔍 Touch support:', 'ontouchstart' in window);
  }, []);

  // Carregar credenciais salvas (Remember Me)
  useEffect(() => {
    const savedUsername = localStorage.getItem('rememberedUsername');
    const savedRememberMe = localStorage.getItem('rememberMe') === 'true';
    
    if (savedRememberMe && savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
      console.log('🔐 Credenciais carregadas do Remember Me');
    }
  }, []);

  // If already logged in, redirect to dashboard
  // Usar um pequeno delay para evitar conflito com o login em andamento
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('🔍 Login useEffect - user check:', { user: !!user, loading, userRole: user?.role });
      if (user && !loading) {
        console.log('🔍 User already logged in, redirecting to dashboard');
        navigate('/dashboard');
      }
    }, 200);
    
    return () => clearTimeout(timer);
  }, [user, navigate, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);

    try {
      console.log('🔐 Iniciando login...');
      console.log('👤 Usuário:', username);
      console.log('🔗 API URL:', window.location.origin);
      
      await login(username, password);
      
      console.log('✅ Login bem-sucedido!');
      
      // Gerenciar Remember Me
      if (rememberMe) {
        localStorage.setItem('rememberedUsername', username);
        localStorage.setItem('rememberMe', 'true');
        console.log('✅ Credenciais salvas (Remember Me)');
      } else {
        localStorage.removeItem('rememberedUsername');
        localStorage.removeItem('rememberMe');
        console.log('🔒 Credenciais removidas (Remember Me desabilitado)');
      }
    } catch (error: any) {
      console.error('❌ Erro durante login:', error);
      console.error('📋 Detalhes:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status
      });
      
      // Mensagem de erro mais específica
      let errorMessage = 'Falha na autenticação. Verifique seu usuário e senha.';
      
      if (error?.response?.status === 401) {
        errorMessage = error?.response?.data?.message || 'Usuário ou senha incorretos.';
      } else if (error?.response?.status === 403) {
        errorMessage = 'Acesso negado. Verifique suas permissões.';
      } else if (error?.response?.status === 500) {
        errorMessage = 'Erro interno do servidor. Tente novamente mais tarde.';
      } else if (error?.response?.status === 522 || (error as any)?.is522Error) {
        errorMessage = 'O servidor está temporariamente indisponível. O servidor de origem não está respondendo. Por favor, tente novamente em alguns instantes. Se o problema persistir, entre em contato com o suporte técnico.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      toast({
        title: 'Erro ao fazer login',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Funções para autenticação de supervisor
  const handleSupervisorCpfLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupervisorError('');
    
    if (!supervisorCpf) {
      setSupervisorError('Por favor, informe o CPF.');
      return;
    }

    setSupervisorLoading(true);

    try {
      const response = await fetch('/api/supervisor-auth/login-cpf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ cpf: supervisorCpf }),
      });

      const data = await response.json();

      if (data.success) {
        setSupervisorData(data.supervisor);
        
        if (data.needsConsent) {
          setNeedsConsent(true);
        } else {
          // Login direto - salvar token e redirecionar
          localStorage.setItem('token', data.token);
          localStorage.setItem('userType', 'SUPERVISOR');
          navigate('/dashboard');
        }
      } else {
        setSupervisorError(data.error || 'Erro na autenticação');
      }
    } catch (error) {
      console.error('Erro no login do supervisor:', error);
      setSupervisorError('Erro de conexão. Tente novamente.');
    } finally {
      setSupervisorLoading(false);
    }
  };


  const handleAcceptTerms = async () => {
    if (!supervisorData) return;

    setSupervisorLoading(true);

    try {
      const response = await fetch('/api/supervisor-auth/accept-terms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ cpf: supervisorData.cpf }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userType', 'SUPERVISOR');
        navigate('/dashboard');
      } else {
        setSupervisorError(data.error || 'Erro ao aceitar termos');
      }
    } catch (error) {
      console.error('Erro ao aceitar termos:', error);
      setSupervisorError('Erro de conexão. Tente novamente.');
    } finally {
      setSupervisorLoading(false);
    }
  };

  const formatCpf = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  return (
    <>
      <SEO 
        title="Login - Área Administrativa"
        description="Acesse o sistema administrativo da Promover Vigilância. Área restrita para funcionários e administradores."
        keywords="login, acesso, sistema, administrativo, promover vigilância"
        noindex={true}
        nofollow={true}
      />
      <div className="min-h-screen w-full bg-gradient-to-b from-seguranca-black via-seguranca-black to-seguranca-graphite flex flex-col items-center justify-center p-4 sm:p-6 animate-fade-in">
        <div className="mb-8 sm:mb-10" data-animate="fadeDown">
          <Logo size="lg" />
        </div>

        <div className="bg-seguranca-black/70 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 space-y-6" data-animate="zoomIn">
          <div className="text-center space-y-2" data-animate="fadeUp">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-seguranca-yellow/15 text-seguranca-yellow text-xs uppercase tracking-wide">
              <Shield size={14} className="text-seguranca-yellow" />
              Acesso seguro
            </span>
            <h2 className="text-2xl font-semibold text-seguranca-lightgray">Acesso ao Sistema</h2>
            <p className="text-sm text-gray-400">
              Escolha seu perfil de acesso para entrar na plataforma Secure Guard.
            </p>
          </div>

          <Tabs defaultValue="funcionario" className="w-full login-tabs">
            <TabsList className="flex w-full gap-2 bg-transparent p-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] mb-6">
              <TabsTrigger
                value="funcionario"
                className="flex-1 min-w-[140px] justify-center whitespace-nowrap border border-gray-700 rounded-lg py-2 sm:py-2.5 text-sm text-seguranca-lightgray data-[state='active']:bg-seguranca-yellow data-[state='active']:text-black transition-colors"
              >
                <User size={16} />
                Funcionário
              </TabsTrigger>
              <TabsTrigger
                value="supervisor"
                className="flex-1 min-w-[140px] justify-center whitespace-nowrap border border-gray-700 rounded-lg py-2 sm:py-2.5 text-sm text-seguranca-lightgray data-[state='active']:bg-seguranca-yellow data-[state='active']:text-black transition-colors"
              >
                <Shield size={16} />
                Supervisor
              </TabsTrigger>
            </TabsList>

            {/* Aba Funcionário */}
            <TabsContent value="funcionario" className="space-y-6">
              {error && (
                <Alert variant="destructive" className="bg-opacity-20 bg-seguranca-yellow border border-seguranca-yellow text-seguranca-yellow">
                  <AlertTriangle size={20} className="mt-0.5" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2 text-left">
                  <Label htmlFor="username" className="block text-sm font-medium">
                    Usuário
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-seguranca-black border-gray-600 focus:border-seguranca-yellow text-white"
                    placeholder="Seu usuário"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label htmlFor="password" className="block text-sm font-medium">
                    Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-seguranca-black border-gray-600 focus:border-seguranca-yellow text-white pr-10"
                      placeholder="********"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-seguranca-yellow"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="remember" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                      className="h-4 w-4 rounded border-gray-600 bg-seguranca-graphite text-seguranca-yellow focus:ring-seguranca-yellow"
                    />
                    <label htmlFor="remember" className="text-sm cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                      Lembrar-me
                    </label>
                  </div>
                  <button 
                    type="button"
                    onClick={() => navigate('/forgot-password')} 
                    className="text-seguranca-lightgray hover:text-seguranca-yellow transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center bg-seguranca-red hover:bg-seguranca-red/90 text-white font-semibold py-3 rounded-lg transition-all"
                >
                  {loading ? (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : 'Entrar'}
                </Button>
              </form>
            </TabsContent>

            {/* Aba Supervisor */}
            <TabsContent value="supervisor" className="space-y-6">
              {supervisorError && (
                <Alert variant="destructive" className="bg-opacity-20 bg-seguranca-yellow border border-seguranca-yellow text-seguranca-yellow">
                  <AlertTriangle size={20} className="mt-0.5" />
                  <AlertDescription>{supervisorError}</AlertDescription>
                </Alert>
              )}

              {/* Modal de Consentimento LGPD */}
              {needsConsent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-seguranca-graphite rounded-xl shadow-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
                    <div className="p-6 border-b border-gray-600">
                      <h3 className="text-xl font-bold text-center">Consentimento LGPD</h3>
                      <p className="text-sm text-gray-400 text-center mt-2">
                        {supervisorData?.name} - {supervisorData?.cpf}
                      </p>
                    </div>
                    
                    <div className="p-6 overflow-y-auto max-h-[50vh] bg-seguranca-black text-sm">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-seguranca-yellow">Termos de Uso</h4>
                        <p>
                          Ao utilizar este sistema, você concorda com os seguintes termos:
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                          <li>Uso responsável do sistema de vigilância</li>
                          <li>Cumprimento das normas de segurança estabelecidas</li>
                          <li>Confidencialidade das informações acessadas</li>
                          <li>Respeito à privacidade dos funcionários e visitantes</li>
                        </ul>
                        
                        <h4 className="font-semibold text-seguranca-yellow mt-6">Política de Privacidade</h4>
                        <p>
                          Seus dados pessoais são tratados de acordo com a Lei Geral de Proteção de Dados (LGPD):
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                          <li>Coleta e processamento de dados com finalidade específica</li>
                          <li>Armazenamento seguro e criptografado</li>
                          <li>Compartilhamento apenas quando necessário</li>
                          <li>Direito de acesso, correção e exclusão dos dados</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="p-6 border-t border-gray-600">
                      <Button
                        onClick={handleAcceptTerms}
                        disabled={supervisorLoading}
                        className="btn-primary w-full"
                      >
                        {supervisorLoading ? 'Processando...' : 'Aceito os Termos'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Login por CPF ou Matrícula */}
              <form onSubmit={handleSupervisorCpfLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="supervisorCpf" className="block text-sm font-medium">
                    CPF ou Matrícula do Supervisor
                  </Label>
                  <Input
                    id="supervisorCpf"
                    type="text"
                    value={supervisorCpf}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Se contém apenas números e tem potencial de ser CPF, formatar
                      if (/^\d/.test(value) && value.replace(/\D/g, '').length <= 11) {
                        setSupervisorCpf(formatCpf(value));
                      } else {
                        // Caso contrário, permitir texto livre para matrícula
                        setSupervisorCpf(value);
                      }
                    }}
                    className="bg-seguranca-black border-gray-600 focus:border-seguranca-yellow text-white"
                    placeholder="000.000.000-00 ou matrícula"
                    maxLength={20}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Informe seu CPF ou número de matrícula
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={supervisorLoading}
                  className="w-full flex justify-center items-center bg-seguranca-red hover:bg-seguranca-red/90 text-white font-semibold py-3 rounded-lg transition-all"
                >
                  {supervisorLoading ? (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : 'Entrar como Supervisor'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-6 text-sm text-gray-500" data-animate="fadeUp" data-delay="500">
          Secure Guard Control © {new Date().getFullYear()}
        </div>
      </div>
    </>
  );
};

export default Login;
