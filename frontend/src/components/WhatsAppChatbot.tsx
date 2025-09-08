import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, X, User, Mail, Phone, Send, Globe, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

const WhatsAppChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [chatMode, setChatMode] = useState<'whatsapp' | 'website' | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{id: number, text: string, sender: 'user' | 'bot', timestamp: Date}>>([{
    id: 1, text: 'Olá! Como posso ajudá-lo hoje?', sender: 'bot', timestamp: new Date()
  }]);
  const [currentMessage, setCurrentMessage] = useState('');

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNextStep = () => {
    if (step === 1 && !formData.name.trim()) {
      toast.error('Por favor, informe seu nome.');
      return;
    }
    if (step === 2 && !formData.email.trim()) {
      toast.error('Por favor, informe seu email.');
      return;
    }
    if (step === 3 && !formData.phone.trim()) {
      toast.error('Por favor, informe seu telefone.');
      return;
    }
    
    if (step < 5) {
      setStep(step + 1);
    }
  };

  const handleSubmitWhatsApp = async () => {
    if (!formData.message.trim()) {
      toast.error('Por favor, digite sua mensagem.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Preparar mensagem para WhatsApp
      const whatsappMessage = `Olá! Gostaria de falar com vocês.\n\n` +
        `*Nome:* ${formData.name}\n` +
        `*Email:* ${formData.email}\n` +
        `*Telefone:* ${formData.phone}\n\n` +
        `*Mensagem:*\n${formData.message}`;

      // Número do WhatsApp da empresa (substitua pelo número real)
      const whatsappNumber = '5531999999999'; // Formato: código do país + DDD + número
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Abrir WhatsApp
      window.open(whatsappUrl, '_blank');
      
      toast.success('Redirecionando para o WhatsApp...');
      
      // Reset form
      setFormData({ name: '', email: '', phone: '', message: '' });
      setStep(1);
      setChatMode(null);
      setIsOpen(false);
    } catch (error) {
      toast.error('Erro ao abrir WhatsApp. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendWebsiteMessage = () => {
    if (!currentMessage.trim()) return;

    const newMessage = {
      id: chatMessages.length + 1,
      text: currentMessage,
      sender: 'user' as const,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, newMessage]);
    setCurrentMessage('');

    // Simular resposta automática
    setTimeout(() => {
      let botResponseText = 'Obrigado pela sua mensagem! Nossa equipe entrará em contato em breve. Para um atendimento mais rápido, você pode nos contatar pelo WhatsApp.';
      
      // Verificar se a mensagem é sobre currículo
      const curriculumKeywords = ['curriculo', 'currículo', 'cv', 'trabalho', 'vaga', 'emprego', 'contratação', 'carreira'];
      const messageText = currentMessage.toLowerCase();
      
      if (curriculumKeywords.some(keyword => messageText.includes(keyword))) {
        botResponseText = 'Para enviar seu currículo, você pode acessar nossa página "Trabalhe Conosco" no portal e se cadastrar para as vagas disponíveis, ou enviar seu currículo diretamente através do formulário de candidatura. Nossa equipe de RH analisará seu perfil e entrará em contato caso haja uma oportunidade adequada!';
      }
      
      const botResponse = {
        id: chatMessages.length + 2,
        text: botResponseText,
        sender: 'bot' as const,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, botResponse]);
    }, 1000);
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep(1);
    setChatMode(null);
    setFormData({ name: '', email: '', phone: '', message: '' });
    setChatMessages([{ id: 1, text: 'Olá! Como posso ajudá-lo hoje?', sender: 'bot', timestamp: new Date() }]);
    setCurrentMessage('');
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <User className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-white">Olá! 👋</h3>
              <p className="text-gray-300">Para começarmos, qual é o seu nome?</p>
            </div>
            <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">Nome Completo</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Digite seu nome"
                onKeyPress={(e) => e.key === 'Enter' && handleNextStep()}
                autoFocus
              />
            </div>
            <Button onClick={handleNextStep} className="w-full bg-green-600 hover:bg-green-700">
              Continuar
            </Button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-white">Ótimo, {formData.name}! 📧</h3>
              <p className="text-gray-300">Agora preciso do seu email para contato:</p>
            </div>
            <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="seu@email.com"
                onKeyPress={(e) => e.key === 'Enter' && handleNextStep()}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setStep(1)}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button onClick={handleNextStep} className="flex-1 bg-green-600 hover:bg-green-700">
                Continuar
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <Phone className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-white">Perfeito! 📞</h3>
              <p className="text-gray-300">Por último, seu telefone para contato:</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-300">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="(00) 00000-0000"
                onKeyPress={(e) => e.key === 'Enter' && handleNextStep()}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setStep(2)}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button onClick={handleNextStep} className="flex-1 bg-green-600 hover:bg-green-700">
                Continuar
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white">Escolha como prefere conversar 💬</h3>
              <p className="text-gray-300">Selecione a opção que for mais conveniente para você:</p>
            </div>
            
            {/* Resumo dos dados */}
            <div className="bg-gray-800 rounded-lg p-3 text-sm text-gray-300">
              <p><strong className="text-white">Nome:</strong> {formData.name}</p>
              <p><strong className="text-white">Email:</strong> {formData.email}</p>
              <p><strong className="text-white">Telefone:</strong> {formData.phone}</p>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={() => {
                  setChatMode('whatsapp');
                  setStep(5);
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white p-4 h-auto"
                variant="default"
              >
                <div className="flex items-center justify-center space-x-3">
                  <MessageCircle className="h-6 w-6" />
                  <div className="text-left">
                    <div className="font-semibold">Continuar no WhatsApp</div>
                    <div className="text-sm opacity-90">Resposta mais rápida e direta</div>
                  </div>
                </div>
              </Button>
              
              <Button 
                onClick={() => {
                  setChatMode('website');
                  setStep(5);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 h-auto"
                variant="default"
              >
                <div className="flex items-center justify-center space-x-3">
                  <Globe className="h-6 w-6" />
                  <div className="text-left">
                    <div className="font-semibold">Conversar aqui no site</div>
                    <div className="text-sm opacity-90">Chat integrado e prático</div>
                  </div>
                </div>
              </Button>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => setStep(3)}
              className="w-full"
            >
              Voltar
            </Button>
          </div>
        );

      case 5:
        if (chatMode === 'whatsapp') {
          return (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-white">Mensagem para WhatsApp 📱</h3>
                <p className="text-gray-300">Digite sua mensagem que será enviada via WhatsApp:</p>
              </div>
              
              <div className="space-y-2">
                 <Label htmlFor="message" className="text-gray-300">Sua mensagem</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  placeholder="Digite sua mensagem ou dúvida..."
                  rows={4}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setStep(4)}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Voltar
                </Button>
                <Button 
                  onClick={handleSubmitWhatsApp} 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    'Enviando...'
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar via WhatsApp
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        } else {
          return (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                  <Globe className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-white">Chat do Site 💻</h3>
                <p className="text-gray-300">Converse conosco aqui mesmo!</p>
              </div>
              
              {/* Chat Messages */}
              <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 h-64 overflow-y-auto space-y-3">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                      msg.sender === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-700 text-gray-200'
                    }`}>
                      <p className="text-sm">{msg.text}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Message Input */}
              <div className="flex gap-2">
                <Input
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendWebsiteMessage()}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendWebsiteMessage}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={!currentMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              <Button 
                variant="outline" 
                onClick={() => setStep(4)}
                className="w-full"
              >
                Voltar às opções
              </Button>
            </div>
          );
        }

      default:
        return null;
    }
  };

  return (
    <>
      {/* Botão Flutuante */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="bg-green-500 hover:bg-green-600 text-white rounded-full w-16 h-16 shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse"
          size="lg"
        >
          <MessageCircle className="h-8 w-8" />
        </Button>
      </div>

      {/* Modal do Chatbot */}
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full bg-gray-900 border-gray-700">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="bg-green-500 rounded-full p-1.5">
                    <MessageCircle className="h-4 w-4 text-white" />
                  </div>
                </div>
                Atendimento Promover
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Online - Resposta rápida
            </div>
          </DialogHeader>

          <div className="py-4">
            {/* Indicador de progresso */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${
                      i <= step ? (chatMode === 'whatsapp' ? 'bg-green-500' : chatMode === 'website' ? 'bg-blue-500' : 'bg-gray-500') : 'bg-gray-300'
                    } transition-colors duration-300`}
                  />
                ))}
              </div>
            </div>

            {renderStep()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WhatsAppChatbot;