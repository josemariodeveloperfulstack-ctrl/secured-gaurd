import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { api } from '@/services/api';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setEmailSent(true);
    } catch (err: any) {
      // Backend retorna sempre sucesso por segurança, mas caso haja erro de conexão:
      setError('Erro ao processar solicitação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-seguranca-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-seguranca-graphite border-gray-600">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
            <CardTitle className="text-2xl text-seguranca-lightgray">Email Enviado!</CardTitle>
            <CardDescription className="text-gray-300">
              Se o email <strong>{email}</strong> estiver cadastrado, você receberá um link para recuperação de senha.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
              <p className="text-sm text-gray-300">
                <strong className="text-blue-400">Verifique sua caixa de entrada</strong>
              </p>
              <ul className="text-sm text-gray-400 mt-2 space-y-1">
                <li>• O email pode demorar alguns minutos para chegar</li>
                <li>• Verifique também a pasta de spam/lixo eletrônico</li>
                <li>• O link expira em 1 hora</li>
              </ul>
            </div>

            <Button
              onClick={() => navigate('/login')}
              variant="outline"
              className="w-full border-gray-600 text-seguranca-lightgray"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-seguranca-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-seguranca-graphite border-gray-600">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-blue-400" />
          </div>
          <CardTitle className="text-2xl text-center text-seguranca-lightgray">Esqueceu sua Senha?</CardTitle>
          <CardDescription className="text-center text-gray-300">
            Digite seu email para receber um link de recuperação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-seguranca-lightgray">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || !email}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Link de Recuperação
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={() => navigate('/login')}
              variant="ghost"
              className="w-full text-gray-400"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;

