import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import SEO from '@/components/SEO';
import Logo from '../components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useAOS } from '@/hooks/use-aos';

const Login = () => {
  const aos = useAOS();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
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
    } catch (error) {
      console.error('Error during sign in:', error);
      setError('Falha na autenticação. Verifique seu usuário e senha.');
    } finally {
      setLoading(false);
    }
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
        <div className="mb-8" data-aos={aos.fadeDown}>
          <Logo size="lg" />
        </div>

        <div className="bg-seguranca-graphite rounded-xl shadow-lg w-full max-w-md p-6 md:p-8" data-aos={aos.zoomIn}>
          <h2 className="text-2xl font-bold text-center mb-6" data-aos={aos.fadeUp}>Acesso ao Sistema</h2>

          {error && (
            <Alert variant="destructive" className="mb-4 bg-opacity-20 bg-seguranca-yellow border border-seguranca-yellow text-seguranca-yellow" data-aos={aos.fadeUp}>
              <AlertTriangle size={20} className="mt-0.5" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2" data-aos={aos.fadeUp} data-aos-delay="100">
              <label htmlFor="username" className="block text-sm font-medium">
                Usuário
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input focus:border-seguranca-yellow"
                placeholder="Seu usuário"
              />
            </div>

            <div className="space-y-2" data-aos={aos.fadeUp} data-aos-delay="200">
              <label htmlFor="password" className="block text-sm font-medium">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pr-10 focus:border-seguranca-yellow"
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

            <div className="flex items-center justify-between text-sm" data-aos={aos.fadeUp} data-aos-delay="300">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="h-4 w-4 rounded border-gray-600 bg-seguranca-graphite text-seguranca-yellow focus:ring-seguranca-yellow"
                />
                <label htmlFor="remember" className="text-sm">
                  Lembrar-me
                </label>
              </div>
              <a href="#" className="text-seguranca-lightgray hover:text-seguranca-yellow transition-colors">
                Esqueci minha senha
              </a>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex justify-center items-center"
              data-aos={aos.fadeUp} data-aos-delay="400"
            >
              {loading ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : 'Entrar'}
            </Button>
          </form>
        </div>

        <div className="mt-6 text-sm text-gray-500" data-aos={aos.fadeUp} data-aos-delay="500">
          Secure Guard Control © {new Date().getFullYear()}
        </div>
      </div>
    </>
  );
};

export default Login;
