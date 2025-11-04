import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, XCircle, Lock, Loader2 } from 'lucide-react';
import SEO from '@/components/SEO';
import Logo from '../components/Logo';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const token = searchParams.get('token');

  // Validar token ao carregar a página
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Token não encontrado na URL.');
        setTokenValid(false);
        setValidating(false);
        return;
      }

      try {
        const response = await api.get(`/api/auth/validate-reset-token?token=${token}`);
        setTokenValid(response.data.success);
        if (!response.data.success) {
          setError('Token inválido ou expirado.');
        }
      } catch (error: any) {
        console.error('Erro ao validar token:', error);
        setError('Token inválido ou expirado.');
        setTokenValid(false);
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validações
    if (!newPassword || !confirmPassword) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/api/auth/reset-password', {
        token,
        newPassword
      });

      if (response.data.success) {
        setSuccess(true);
        toast({
          title: "Senha redefinida!",
          description: "Sua senha foi alterada com sucesso. Você será redirecionado para o login.",
          variant: "default",
        });

        // Redirecionar para login após 3 segundos
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(response.data.message || 'Erro ao redefinir senha.');
      }
    } catch (error: any) {
      console.error('Erro ao redefinir senha:', error);
      setError(error.response?.data?.message || 'Erro ao redefinir senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Tela de validação
  if (validating) {
    return (
      <div className="min-h-screen w-full bg-seguranca-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-seguranca-yellow mx-auto mb-4"></div>
          <p className="text-seguranca-lightgray">Validando token...</p>
        </div>
      </div>
    );
  }

  // Tela de token inválido
  if (!tokenValid) {
    return (
      <>
        <SEO
          title="Token Inválido - SecuredGuard"
          description="Token de recuperação de senha inválido ou expirado"
        />
      <div className="min-h-screen w-full bg-seguranca-black flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6 sm:mb-8">
            <Logo className="h-12 sm:h-16 mx-auto mb-3 sm:mb-4" />
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Token Inválido</h1>
          </div>

          <div className="bg-seguranca-graphite rounded-xl border border-gray-700 p-4 sm:p-6">
              <div className="text-center mb-6">
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <p className="text-seguranca-lightgray mb-4">{error}</p>
                <p className="text-sm text-gray-400">
                  Por favor, solicite uma nova recuperação de senha.
                </p>
              </div>

              <Button
                onClick={() => navigate('/login')}
                className="btn-primary w-full"
              >
                Voltar para Login
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Tela de sucesso
  if (success) {
    return (
      <>
        <SEO
          title="Senha Redefinida - SecuredGuard"
          description="Senha redefinida com sucesso"
        />
      <div className="min-h-screen w-full bg-seguranca-black flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6 sm:mb-8">
            <Logo className="h-12 sm:h-16 mx-auto mb-3 sm:mb-4" />
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Senha Redefinida!</h1>
          </div>

          <div className="bg-seguranca-graphite rounded-xl border border-gray-700 p-4 sm:p-6">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-seguranca-lightgray mb-4">
                  Sua senha foi alterada com sucesso!
                </p>
                <p className="text-sm text-gray-400 mb-6">
                  Você será redirecionado para o login em instantes...
                </p>
                <Button
                  onClick={() => navigate('/login')}
                  className="btn-primary w-full"
                >
                  Ir para Login
                </Button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Formulário de redefinição de senha
  return (
    <>
      <SEO
        title="Redefinir Senha - SecuredGuard"
        description="Redefina sua senha de acesso ao sistema"
      />
      <div className="min-h-screen w-full bg-seguranca-black flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6 sm:mb-8">
            <Logo className="h-12 sm:h-16 mx-auto mb-3 sm:mb-4" />
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Redefinir Senha</h1>
            <p className="text-xs sm:text-sm text-seguranca-lightgray">
              Escolha uma nova senha para sua conta
            </p>
          </div>

          <div className="bg-seguranca-graphite rounded-xl border border-gray-700 p-4 sm:p-6">
            {error && (
              <Alert variant="destructive" className="mb-6 bg-opacity-20 bg-red-500 border border-red-500 text-red-500">
                <XCircle size={20} className="mt-0.5" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="block text-xs sm:text-sm font-medium text-seguranca-lightgray flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Nova Senha
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-seguranca-black border-gray-600 focus:border-seguranca-yellow text-white pr-10"
                    placeholder="Mínimo 6 caracteres"
                    required
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-medium text-seguranca-lightgray flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Confirmar Nova Senha
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-seguranca-black border-gray-600 focus:border-seguranca-yellow text-white pr-10"
                    placeholder="Digite a senha novamente"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-seguranca-yellow"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="bg-seguranca-black border border-gray-600 rounded-lg p-2.5 sm:p-3">
                <p className="text-xs text-gray-400 mb-2 font-medium">Requisitos:</p>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li className={newPassword.length >= 6 ? 'text-green-500' : ''}>
                    • Pelo menos 6 caracteres
                  </li>
                  <li className={/[A-Z]/.test(newPassword) ? 'text-green-500' : ''}>
                    • Letras maiúsculas
                  </li>
                  <li className={/[a-z]/.test(newPassword) ? 'text-green-500' : ''}>
                    • Letras minúsculas
                  </li>
                  <li className={/\d/.test(newPassword) ? 'text-green-500' : ''}>
                    • Números
                  </li>
                  <li className={/[^a-zA-Z0-9]/.test(newPassword) ? 'text-green-500' : ''}>
                    • Caracteres especiais (!@#$%^&*)
                  </li>
                </ul>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="btn-primary w-full h-10 sm:h-11 text-sm sm:text-base"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Redefinindo...
                  </>
                ) : (
                  'Redefinir Senha'
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-xs sm:text-sm text-seguranca-lightgray hover:text-seguranca-yellow transition-colors"
                >
                  Voltar para Login
                </button>
              </div>
            </form>
          </div>

          <div className="mt-6 text-sm text-gray-500 text-center">
            Secure Guard Control © {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </>
  );
};

export default ResetPassword;

