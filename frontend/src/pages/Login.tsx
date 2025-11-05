import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertTriangle, User, Shield, Camera, CreditCard } from 'lucide-react';
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
  const [supervisorAuthMethod, setSupervisorAuthMethod] = useState<'cpf' | 'facial'>('cpf');
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<File | null>(null);
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
  useEffect(() => {
    console.log('🔍 Login useEffect - user check:', user);
    if (user) {
      console.log('🔍 User already logged in, redirecting to dashboard');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);

    try {
      await login(username, password);
      
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
    } catch (error) {
      console.error('Error during sign in:', error);
      setError('Falha na autenticação. Verifique seu usuário e senha.');
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

  const handleSupervisorFacialLogin = async (imageFile: File) => {
    setSupervisorError('');
    setSupervisorLoading(true);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch('/api/supervisor-auth/login-facial', {
        method: 'POST',
        body: formData,
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
        setSupervisorError(data.error || 'Face não reconhecida');
      }
    } catch (error) {
      console.error('Erro no reconhecimento facial:', error);
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
      <div className="min-h-screen w-full bg-seguranca-black flex flex-col items-center justify-center p-4 animate-fade-in">
        <div className="mb-8" data-animate="fadeDown">
          <Logo size="lg" />
        </div>

        <div className="bg-seguranca-graphite rounded-xl shadow-lg w-full max-w-md p-6 md:p-8" data-animate="zoomIn">
          <h2 className="text-2xl font-bold text-center mb-6" data-animate="fadeUp">Acesso ao Sistema</h2>

          <Tabs defaultValue="funcionario" className="w-full login-tabs">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="funcionario" className="flex items-center gap-2">
                <User size={16} />
                Funcionário
              </TabsTrigger>
              <TabsTrigger value="supervisor" className="flex items-center gap-2">
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
                <div className="space-y-2">
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

                <div className="space-y-2">
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

                <div className="flex items-center justify-between text-sm">
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
                  className="btn-primary w-full flex justify-center items-center"
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

              {/* Seleção do método de autenticação */}
              <div className="flex gap-2 mb-4">
                <Button
                  type="button"
                  variant={supervisorAuthMethod === 'cpf' ? 'default' : 'outline'}
                  onClick={() => setSupervisorAuthMethod('cpf')}
                  className="flex-1 flex items-center gap-2"
                >
                  <CreditCard size={16} />
                  CPF
                </Button>
                <Button
                  type="button"
                  variant={supervisorAuthMethod === 'facial' ? 'default' : 'outline'}
                  onClick={() => setSupervisorAuthMethod('facial')}
                  className="flex-1 flex items-center gap-2"
                >
                  <Camera size={16} />
                  Reconhecimento Facial
                </Button>
              </div>

              {/* Login por CPF */}
              {supervisorAuthMethod === 'cpf' && (
                <form onSubmit={handleSupervisorCpfLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="supervisorCpf" className="block text-sm font-medium">
                      CPF do Supervisor
                    </Label>
                    <Input
                      id="supervisorCpf"
                      type="text"
                      value={supervisorCpf}
                      onChange={(e) => setSupervisorCpf(formatCpf(e.target.value))}
                      className="bg-seguranca-black border-gray-600 focus:border-seguranca-yellow text-white"
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={supervisorLoading}
                    className="btn-primary w-full flex justify-center items-center"
                  >
                    {supervisorLoading ? (
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : 'Entrar como Supervisor'}
                  </Button>
                </form>
              )}

              {/* Login por Reconhecimento Facial */}
              {supervisorAuthMethod === 'facial' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <Camera size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-sm text-gray-400 mb-4">
                      Posicione seu rosto na câmera para autenticação
                    </p>
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleSupervisorFacialLogin(file);
                      }
                    }}
                    className="hidden"
                    id="facial-input"
                  />

                  <Button
                    type="button"
                    onClick={() => document.getElementById('facial-input')?.click()}
                    disabled={supervisorLoading}
                    className="btn-primary w-full flex justify-center items-center"
                  >
                    <Camera size={16} className="mr-2" />
                    {supervisorLoading ? 'Reconhecendo...' : 'Capturar Face'}
                  </Button>
                </div>
              )}
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
