import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, MessageSquare, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import SEO from '@/components/SEO';
import Logo from '../components/Logo';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';

const FirstAccessActivate2FA = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [error, setError] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    setError('');
    setSendingCode(true);

    try {
      const response = await api.post('/api/first-access/request-2fa-code');

      if (response.data.success) {
        setCodeSent(true);
        setWhatsappNumber(response.data.message);
        setCountdown(60); // 60 segundos para reenvio
        toast({
          title: "Código enviado!",
          description: response.data.message,
          variant: "default",
        });
      } else {
        setError(response.data.message || 'Erro ao enviar código.');
      }
    } catch (error: any) {
      console.error('Erro ao enviar código:', error);
      setError(error.response?.data?.message || 'Erro ao enviar código. Tente novamente.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!code || code.length !== 6) {
      setError('Por favor, informe o código de 6 dígitos.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/api/first-access/activate-2fa', {
        code
      });

      if (response.data.success) {
        toast({
          title: "2FA Ativado!",
          description: response.data.message,
          variant: "default",
        });

        // Redirecionar para dashboard
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setError(response.data.message || 'Código inválido.');
      }
    } catch (error: any) {
      console.error('Erro ao ativar 2FA:', error);
      setError(error.response?.data?.message || 'Código inválido ou expirado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatCode = (value: string) => {
    return value.replace(/\D/g, '').slice(0, 6);
  };

  return (
    <>
      <SEO
        title="Primeiro Acesso - Ativar 2FA"
        description="Ative a autenticação de dois fatores"
        noindex={true}
      />
      <div className="min-h-screen w-full bg-seguranca-black flex flex-col items-center justify-center p-4">
        <div className="mb-6 sm:mb-8">
          <Logo size="lg" />
        </div>

        <div className="bg-seguranca-graphite rounded-xl border border-gray-700 w-full max-w-md p-4 sm:p-6">
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-green-500/20 rounded-lg flex items-center justify-center mb-3">
              <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-seguranca-lightgray mb-2">
              Ativar 2FA
            </h2>
            <p className="text-xs sm:text-sm text-gray-400">
              Ative a verificação em duas etapas via WhatsApp
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4 bg-opacity-20 bg-red-500 border border-red-500 text-red-500">
              <AlertTriangle size={20} className="mt-0.5" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!codeSent ? (
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 sm:p-4">
                <div className="flex gap-2 sm:gap-3">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm text-blue-200">
                    <p className="font-medium mb-1">Como funciona?</p>
                    <p className="text-xs">
                      Código de 6 dígitos será enviado para seu WhatsApp
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSendCode}
                disabled={sendingCode}
                className="btn-primary w-full h-10 sm:h-11 text-sm sm:text-base"
              >
                {sendingCode ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Enviar Código
                  </>
                )}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div className="bg-green-900/20 border border-green-800 rounded-lg p-3 sm:p-4">
                <div className="flex gap-2 sm:gap-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm text-green-200">
                    <p className="font-medium mb-1">Código Enviado!</p>
                    <p className="text-xs">
                      {whatsappNumber}
                    </p>
                    <p className="text-xs mt-1 text-green-300">
                      Expira em 5 minutos
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code" className="text-xs sm:text-sm font-medium text-seguranca-lightgray">
                  Código de Verificação *
                </Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(formatCode(e.target.value))}
                  className="bg-seguranca-black border-gray-600 focus:border-seguranca-yellow text-white text-center text-xl sm:text-2xl tracking-widest h-12 sm:h-14"
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-400 text-center">
                  6 dígitos do WhatsApp
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading || code.length !== 6}
                className="btn-primary w-full h-10 sm:h-11 text-sm sm:text-base"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Ativando...
                  </>
                ) : (
                  'Ativar 2FA'
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendingCode || countdown > 0}
                  className={`text-xs sm:text-sm ${countdown > 0 ? 'text-gray-500 cursor-not-allowed' : 'text-seguranca-yellow hover:underline'}`}
                >
                  {countdown > 0 ? `Reenviar em ${countdown}s` : 'Reenviar código'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-6 text-sm text-gray-500 text-center">
          Secure Guard Control © {new Date().getFullYear()}
        </div>
      </div>
    </>
  );
};

export default FirstAccessActivate2FA;

