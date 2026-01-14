import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import SEO from '@/components/SEO';
import Logo from '../components/Logo';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';

const FirstAccessChangePassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setFirstAccessCompleted } = useAuth();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validatePassword = (password: string) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);
    const hasMinLength = password.length >= 6;

    return {
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      hasSpecial,
      hasMinLength,
      isValid: hasUpperCase && hasLowerCase && hasNumber && hasSpecial && hasMinLength
    };
  };

  const passwordValidation = validatePassword(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (!passwordValidation.isValid) {
      setError('A nova senha não atende aos requisitos de segurança.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/api/first-access/change-password', {
        currentPassword,
        newPassword,
        confirmPassword
      });

      if (response.data.success) {
        toast({
          title: "Senha alterada!",
          description: response.data.message || "Senha alterada com sucesso. Redirecionando para o dashboard...",
          variant: "default",
        });

        // Atualizar estado de autenticação para liberar o acesso ao dashboard
        setFirstAccessCompleted(true);

        // Aguardar um pouco para o usuário ver a mensagem de sucesso
        setTimeout(() => {
          // Redirecionar para o dashboard após atualizar senha
          navigate('/dashboard', { replace: true });
        }, 1000);
      } else {
        setError(response.data.message || 'Erro ao alterar senha.');
      }
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      setError(error.response?.data?.message || 'Erro ao alterar senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="Primeiro Acesso - Alterar Senha"
        description="Altere sua senha no primeiro acesso ao sistema"
        noindex={true}
      />
      <div className="min-h-screen w-full bg-seguranca-black flex flex-col items-center justify-center p-4">
        <div className="mb-6 sm:mb-8">
          <Logo size="lg" />
        </div>

        <div className="bg-seguranca-graphite rounded-xl border border-gray-700 w-full max-w-md p-4 sm:p-6">
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-seguranca-yellow/20 rounded-lg flex items-center justify-center mb-3">
              <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-seguranca-yellow" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-seguranca-lightgray mb-2">
              Primeiro Acesso
            </h2>
            <p className="text-xs sm:text-sm text-gray-400">
              Por segurança, você deve alterar sua senha no primeiro acesso
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4 bg-opacity-20 bg-red-500 border border-red-500 text-red-500">
              <AlertTriangle size={20} className="mt-0.5" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {/* Senha Atual */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-xs sm:text-sm font-medium text-seguranca-lightgray">
                Senha Atual *
              </Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="bg-seguranca-black border-gray-600 focus:border-seguranca-yellow text-white pr-10"
                  placeholder="Digite sua senha atual"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-seguranca-yellow"
                >
                  {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Nova Senha */}
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-xs sm:text-sm font-medium text-seguranca-lightgray">
                Nova Senha *
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-seguranca-black border-gray-600 focus:border-seguranca-yellow text-white pr-10"
                  placeholder="Digite sua nova senha"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-seguranca-yellow"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirmar Senha */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-xs sm:text-sm font-medium text-seguranca-lightgray">
                Confirmar Nova Senha *
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-seguranca-black border-gray-600 focus:border-seguranca-yellow text-white pr-10"
                  placeholder="Confirme sua nova senha"
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

            {/* Requisitos da Senha */}
            {newPassword && (
              <div className="bg-seguranca-black border border-gray-600 rounded-lg p-2.5 sm:p-3">
                <p className="text-xs text-gray-400 mb-2 font-medium">Requisitos da senha:</p>
                <div className="space-y-1 text-xs">
                  <div className={`flex items-center gap-2 ${passwordValidation.hasMinLength ? 'text-green-400' : 'text-gray-400'}`}>
                    {passwordValidation.hasMinLength ? <CheckCircle size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-600"></div>}
                    <span>Pelo menos 6 caracteres</span>
                  </div>
                  <div className={`flex items-center gap-2 ${passwordValidation.hasUpperCase ? 'text-green-400' : 'text-gray-400'}`}>
                    {passwordValidation.hasUpperCase ? <CheckCircle size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-600"></div>}
                    <span>Letra maiúscula (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-2 ${passwordValidation.hasLowerCase ? 'text-green-400' : 'text-gray-400'}`}>
                    {passwordValidation.hasLowerCase ? <CheckCircle size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-600"></div>}
                    <span>Letra minúscula (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-2 ${passwordValidation.hasNumber ? 'text-green-400' : 'text-gray-400'}`}>
                    {passwordValidation.hasNumber ? <CheckCircle size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-600"></div>}
                    <span>Número (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-2 ${passwordValidation.hasSpecial ? 'text-green-400' : 'text-gray-400'}`}>
                    {passwordValidation.hasSpecial ? <CheckCircle size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-600"></div>}
                    <span>Caractere especial (!@#$%&*)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Aviso de Match */}
            {confirmPassword && newPassword && (
              <div className={`text-xs ${newPassword === confirmPassword ? 'text-green-400' : 'text-red-400'}`}>
                {newPassword === confirmPassword ? '✓ As senhas coincidem' : '✗ As senhas não coincidem'}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !passwordValidation.isValid || newPassword !== confirmPassword}
              className="btn-primary w-full h-10 sm:h-11 text-sm sm:text-base mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Alterando...
                </>
              ) : (
                'Alterar Senha e Continuar'
              )}
            </Button>
          </form>
        </div>

        <div className="mt-6 text-sm text-gray-500 text-center">
          Secure Guard Control © {new Date().getFullYear()}
        </div>
      </div>
    </>
  );
};

export default FirstAccessChangePassword;

