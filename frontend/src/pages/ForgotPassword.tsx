import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, ArrowLeft, Send, CheckCircle2, MessageCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '@/services/api';
import Logo from '../components/Logo';

type DeliveryMethod = 'email' | 'whatsapp';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<DeliveryMethod>('email');
  const [whatsappWarning, setWhatsappWarning] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setWhatsappWarning(null);
    setIsSubmitting(true);

    try {
      const response = await api.post('/api/auth/forgot-password', { 
        email,
        deliveryMethod: selectedMethod 
      });

      if (response.data.success) {
        if (response.data.warning) {
          // Usuário não tem WhatsApp cadastrado
          setWhatsappWarning(response.data.warning);
        } else {
          setSent(true);
        }
      } else {
        setError(response.data.message || 'Erro ao processar solicitação.');
      }
    } catch (err: any) {
      console.error('Erro ao solicitar recuperação:', err);
      
      if (err.response?.data?.warning) {
        // Caso específico: WhatsApp não cadastrado
        setWhatsappWarning(err.response.data.warning);
      } else {
        setError('Erro ao processar solicitação. Tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-seguranca-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-seguranca-graphite border-gray-600">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
            <CardTitle className="text-2xl text-seguranca-lightgray">
              {selectedMethod === 'email' ? 'Email Enviado!' : 'Mensagem Enviada!'}
            </CardTitle>
            <CardDescription className="text-gray-300">
              Se o email <strong>{email}</strong> estiver cadastrado, você receberá um link para recuperação de senha.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
              <p className="text-sm text-gray-300">
                <strong className="text-blue-400">
                  {selectedMethod === 'email' 
                    ? 'Verifique sua caixa de entrada' 
                    : 'Verifique seu WhatsApp'}
                </strong>
              </p>
              <ul className="text-sm text-gray-400 mt-2 space-y-1">
                {selectedMethod === 'email' ? (
                  <>
                    <li>• O email pode demorar alguns minutos para chegar</li>
                    <li>• Verifique também a pasta de spam/lixo eletrônico</li>
                    <li>• O link expira em 1 hora</li>
                  </>
                ) : (
                  <>
                    <li>• A mensagem pode demorar alguns segundos para chegar</li>
                    <li>• Verifique se o WhatsApp está ativo</li>
                    <li>• O link expira em 1 hora</li>
                  </>
                )}
              </ul>
            </div>

            <Button
              onClick={() => navigate('/login')}
              variant="outline"
              className="w-full border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
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
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <CardTitle className="text-2xl text-center text-seguranca-lightgray">Esqueceu sua Senha?</CardTitle>
          <CardDescription className="text-center text-gray-300">
            Escolha como deseja receber o link de recuperação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Opções de envio */}
            <Tabs value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as DeliveryMethod)}>
              <TabsList className="grid w-full grid-cols-2 bg-seguranca-black">
                <TabsTrigger 
                  value="email"
                  className="data-[state=active]:bg-seguranca-yellow data-[state=active]:text-seguranca-black"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </TabsTrigger>
                <TabsTrigger 
                  value="whatsapp"
                  className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Campo de email */}
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
                className="bg-seguranca-black border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow"
              />
              <p className="text-xs text-gray-400">
                {selectedMethod === 'email' 
                  ? 'Enviaremos um link de recuperação para este email'
                  : 'Enviaremos um link de recuperação via WhatsApp cadastrado neste email'}
              </p>
            </div>

            {/* Aviso de WhatsApp não cadastrado */}
            {whatsappWarning && (
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <p className="text-sm text-yellow-300 font-semibold">
                      WhatsApp não cadastrado
                    </p>
                    <p className="text-sm text-gray-300">
                      {whatsappWarning}
                    </p>
                    <p className="text-sm text-gray-400">
                      Entre em contato com o administrador do sistema para atualizar seus dados de contato.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Erro genérico */}
            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Botões */}
            <div className="space-y-2">
              <Button
                type="submit"
                disabled={isSubmitting || !email}
                className={`w-full ${
                  selectedMethod === 'whatsapp' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {selectedMethod === 'email' 
                      ? 'Enviar por Email' 
                      : 'Enviar por WhatsApp'}
                  </>
                )}
              </Button>

              <Button
                type="button"
                onClick={() => navigate('/login')}
                variant="ghost"
                className="w-full text-gray-400 hover:text-seguranca-yellow"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
