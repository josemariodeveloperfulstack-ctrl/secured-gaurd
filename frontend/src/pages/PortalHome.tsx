import React, { useState, useMemo, lazy, Suspense } from 'react';
import Navbar from '@/components/Navbar';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Users, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Award,
  ArrowRight,
  CheckCircle,
  Star,
  Building,
  Home,
  Truck,
  ShoppingBag,
  Factory,
  Heart
} from 'lucide-react';
import { useAOS } from '@/hooks/use-aos';
import Logo from '@/components/Logo';
import LoadingSpinner from '@/components/LoadingSpinner';

// Lazy load dos modais para melhor performance
const QuoteModal = lazy(() => import('@/components/QuoteModal'));
const WhatsAppChatbot = lazy(() => import('@/components/WhatsAppChatbot'));

const PortalHome = () => {
  const aos = useAOS();
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  // Memoizar dados estáticos para evitar recriação desnecessária
  const services = useMemo(() => [
    {
      icon: Shield,
      title: "Vigilância Patrimonial",
      description: "Serviço destinado ao cuidado necessário para proteção do patrimônio físico, área interna/externa e também instalação.",
      features: ["Proteção 24h", "Áreas internas e externas", "Monitoramento contínuo"]
    },
    {
      icon: Users,
      title: "Portaria",
      description: "Fiscaliza e orienta a entrada e saída de pessoas do seu posto de serviço.",
      features: ["Controle de acesso", "Orientações", "Fiscalização"]
    },
    {
      icon: Shield,
      title: "Controlador de Acesso",
      description: "Responsável por monitorar e controlar o acesso de pessoas e veículos em determinados locais de maior circulação.",
      features: ["Monitoramento", "Controle de veículos", "Áreas de alta circulação"]
    },
    {
      icon: Shield,
      title: "Vigia",
      description: "Serviço destinado a guarda e vigilância, com o objetivo de inibir ou detectar tentativas de crimes.",
      features: ["Guarda e vigilância", "Prevenção de crimes", "Detecção de ameaças"]
    },
    {
      icon: Users,
      title: "Facilities",
      description: "Serviço voltado a limpeza e manutenção das áreas administrativas, internas e externas da sua empresa.",
      features: ["Limpeza", "Manutenção", "Áreas administrativas"]
    }
  ], []);

  const sectors = useMemo(() => [
    { icon: Factory, name: "Indústrias" },
    { icon: Home, name: "Condomínios" },
    { icon: Building, name: "Mineradoras" },
    { icon: Heart, name: "Hospitais" },
    { icon: Truck, name: "Transportadoras" },
    { icon: ShoppingBag, name: "Shopping Centers" }
  ], []);

  const benefits = useMemo(() => [
    "Foco no que importa em seu negócio",
    "Continuidade do serviço",
    "Acompanhamento diuturno das operações",
    "Estabilidade Operacional"
  ], []);

  const differentials = useMemo(() => [
    "Autorização da Polícia Federal para execução dos serviços de segurança",
    "Acompanhamento constante das atividades",
    "Treinamento e desenvolvimento contínuo dos colaboradores",
    "Atendimento personalizado"
  ], []);

  return (
    <>
      <SEO 
        title="Promover Vigilância - Segurança Patrimonial 24h"
        description="Empresa especializada em vigilância patrimonial e terceirização de serviços. Proteção 24h para seu patrimônio, empresa e família. Solicite seu orçamento."
        keywords="vigilância patrimonial, segurança 24h, terceirização de serviços, portaria, controlador de acesso, vigia, facilities, proteção patrimonial"
        type="website"
        url="https://promover.com.br"
      />
      <div className="min-h-screen" style={{ backgroundColor: '#292929' }}>
        <Navbar />
        {/* Hero Section */}
        <section id="inicio" className="py-12 sm:py-20 px-4" style={{ backgroundColor: '#292929' }}>
          <div className="container mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-white mb-6" data-aos={aos.fadeUp}>
              Estamos disponíveis para te atender
              <span className="text-red-600 block">24 horas por dia</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-8 max-w-4xl mx-auto" data-aos={aos.fadeUp} data-aos-delay="200">
              Deixe o seu patrimônio, sua empresa e sua família mais segura. 
              Invista na tranquilidade e escolha a Promover.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center" data-aos={aos.fadeUp} data-aos-delay="400">
  <Button 
    size="lg" 
    className="bg-red-600 hover:bg-red-700 text-lg px-8 py-4 flex items-center"
    onClick={() => setIsQuoteModalOpen(true)}
  >
    Solicitar Orçamento
    <ArrowRight className="ml-2 h-5 w-5" />
  </Button>
  <Button size="lg" variant="outline" className="text-yellow-400 border-yellow-400 hover:bg-yellow-400 hover:text-black text-lg px-8 py-4">
    Fale Conosco
  </Button>
</div>
          </div>
        </section>

        {/* About Section */}
        <section id="quem-somos" className="py-12 sm:py-20 px-4" style={{ backgroundColor: '#1a1a1a' }}>
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4" data-aos={aos.fadeUp}>Quem Somos</h2>
              <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-4xl mx-auto" data-aos={aos.fadeUp} data-aos-delay="200">
                A Promover é um grupo empresarial especializado em terceirização de mão de obra, 
                difundida em duas vertentes: <strong className="text-red-600">VIGILÂNCIA PATRIMONIAL & TERCEIRIZAÇÃO DE SERVIÇOS</strong>
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
              <div data-aos={aos.fadeRight}>
                <p className="text-base sm:text-lg leading-relaxed text-gray-300 mb-6">
                  A empresa foi desenvolvida para tornar seus processos mais eficientes, 
                  agregando competência e qualidade técnica para suas entregas e etapas de produção. 
                  Assim, você pode ter a liberdade de focar no que realmente importa em seu negócio.
                </p>
                <p className="text-base sm:text-lg leading-relaxed text-gray-300">
                  Nosso grupo nasceu da necessidade de uma prestação de serviços de qualidade 
                  nas áreas de segurança e facilities.
                </p>
              </div>
              <div className="bg-gray-800 p-6 sm:p-8 rounded-lg border border-gray-700" data-aos={aos.fadeLeft}>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-6">Nossos Diferenciais</h3>
                <div className="space-y-3 sm:space-y-4">
                  {differentials.map((differential, index) => (
                    <div key={index} className="flex items-start space-x-3" data-aos={aos.fadeLeft} data-aos-delay={index * 100}>
                      <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 mt-1 flex-shrink-0" />
                      <p className="text-sm sm:text-base text-gray-300">{differential}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="servicos" className="py-12 sm:py-20 px-4" style={{ backgroundColor: '#292929' }}>
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4" data-aos={aos.fadeUp}>Nossos Segmentos</h2>
              <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl mx-auto" data-aos={aos.fadeUp} data-aos-delay="200">
                Oferecemos soluções completas em segurança e facilities para atender 
                às necessidades específicas de cada cliente.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {services.map((service, index) => (
                <Card key={index} className="bg-gray-900 hover:bg-gray-800 transition-all duration-300 border-0 shadow-lg border-gray-700" 
                      data-aos={aos.fadeUp} data-aos-delay={index * 100}>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <service.icon className="h-7 w-7 sm:h-8 sm:w-8 text-red-600" />
                      <CardTitle className="text-lg sm:text-xl text-white">{service.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm sm:text-base text-gray-300 mb-4">{service.description}</p>
                    <ul className="space-y-1 sm:space-y-2">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center text-sm sm:text-base text-gray-300">
                          <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 mr-2" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Sectors Section */}
        <section className="py-12 sm:py-20 px-4" style={{ backgroundColor: '#1a1a1a' }}>
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4" data-aos={aos.fadeUp}>Setores de Atuação</h2>
              <p className="text-base sm:text-lg md:text-xl text-gray-300" data-aos={aos.fadeUp} data-aos-delay="200">
                Temos uma lista variada dos setores que atuamos e disponibilizamos nossos serviços:
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-8">
              {sectors.map((sector, index) => (
                <Card key={index} className="bg-black text-center hover:bg-gray-800 transition-all duration-300 border-0 shadow-lg border-gray-700"
                      data-aos={aos.zoomIn} data-aos-delay={index * 100}>
                  <CardContent className="p-4 sm:p-6">
                    <sector.icon className="h-10 w-10 sm:h-12 sm:w-12 text-red-600 mx-auto mb-2 sm:mb-4" />
                    <h3 className="text-sm sm:text-base font-semibold text-white">{sector.name}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-12 sm:py-20 px-4 bg-gradient-to-r from-yellow-600 to-yellow-500">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-black mb-4" data-aos={aos.fadeUp}>Benefícios</h2>
              <p className="text-base sm:text-lg md:text-xl text-gray-800" data-aos={aos.fadeUp} data-aos-delay="200">
                Vantagens de ter a Promover como parceira:
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {benefits.map((benefit, index) => (
                <Card key={index} className="bg-white text-center hover:shadow-lg transition-all duration-300 border-0 shadow-md"
                      data-aos={aos.fadeUp} data-aos-delay={index * 150}>
                  <CardContent className="p-4 sm:p-6">
                    <Award className="h-10 w-10 sm:h-12 sm:w-12 text-red-600 mx-auto mb-2 sm:mb-4" />
                    <p className="text-sm sm:text-base text-gray-800 font-medium">{benefit}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 sm:py-20 px-4 bg-red-600">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4" data-aos={aos.fadeUp}>
              Pronto para Proteger seu Patrimônio?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-red-100 mb-8 max-w-2xl mx-auto" data-aos={aos.fadeUp} data-aos-delay="200">
              Entre em contato conosco e descubra como podemos ajudar a garantir 
              a segurança que você precisa.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center" data-aos={aos.fadeUp} data-aos-delay="400">
              <Button 
                size="lg" 
                variant="secondary" 
                className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4"
                onClick={() => setIsQuoteModalOpen(true)}
              >
                Solicitar Orçamento
              </Button>
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-red-600 text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4">
                Falar com Especialista
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 sm:py-12 px-4 border-t border-gray-700" style={{ backgroundColor: '#1a1a1a' }}>
          <div className="container mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12">
              <div data-aos={aos.fadeRight}>
                <div className="flex items-center space-x-2 mb-4">
                  <Logo size="sm" type="full" />
                </div>
                <p className="text-sm sm:text-base text-gray-300 mb-4">
                  Segurança patrimonial de qualidade para sua tranquilidade.
                </p>
                <div className="flex space-x-3 sm:space-x-4">
                  <a href="#" className="text-gray-400 hover:text-white">
                    <Phone className="h-4 w-4 sm:h-5 sm:w-5" />
                  </a>
                  <a href="#" className="text-gray-400 hover:text-white">
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
                  </a>
                  <a href="#" className="text-gray-400 hover:text-white">
                    <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
                  </a>
                </div>
              </div>
              
              <div data-aos={aos.fadeUp} data-aos-delay="100">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Serviços</h3>
                <ul className="space-y-1 sm:space-y-2 text-sm sm:text-base text-gray-300">
                  <li><a href="#" className="hover:text-white">Vigilância Patrimonial</a></li>
                  <li><a href="#" className="hover:text-white">Portaria</a></li>
                  <li><a href="#" className="hover:text-white">Controlador de Acesso</a></li>
                  <li><a href="#" className="hover:text-white">Facilities</a></li>
                </ul>
              </div>
              
              <div data-aos={aos.fadeUp} data-aos-delay="200">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Empresa</h3>
                <ul className="space-y-1 sm:space-y-2 text-sm sm:text-base text-gray-300">
                  <li><a href="#" className="hover:text-white">Quem Somos</a></li>
                  <li><a href="/portal/vagas" className="hover:text-white">Trabalhe Conosco</a></li>
                  <li><a href="#" className="hover:text-white">Orçamento</a></li>
                  <li><a href="#contato" className="hover:text-white">Contato</a></li>
                  <li><a href="/login" className="text-black hover:text-gray-800 px-2 py-1 rounded text-sm" style={{ backgroundColor: '#FFF600' }}>Área Administrativa</a></li>
                </ul>
              </div>
              
              <div data-aos={aos.fadeLeft}>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Contatos</h3>
                <div className="space-y-1 sm:space-y-2 text-sm sm:text-base text-gray-300">
                  <p className="flex items-center">
                    <Phone className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    (31) 2559-1245
                  </p>
                  <p className="flex items-center">
                    <Phone className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    (31) 97130-3587
                  </p>
                  <p className="flex items-center">
                    <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    comercial@promovervigilancia.com.br
                  </p>
                  <p className="flex items-center">
                    <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    planejamento@promovervigilancia.com.br
                  </p>
                  <p className="flex items-center">
                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Rua Cel. João Camargos, 267 – Centro – Contagem – MG
                  </p>
                  <p className="flex items-center">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    24h por dia
                  </p>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-800 mt-6 pt-6 text-center text-gray-400" data-aos={aos.fadeUp}>
              <p className="text-xs sm:text-sm">&copy; 2024 Promover Vigilância Patrimonial. Todos os direitos reservados.</p>
            </div>
          </div>
        </footer>
      </div>
      
      {/* Quote Modal */}
      <Suspense fallback={<LoadingSpinner />}>
        <QuoteModal 
          isOpen={isQuoteModalOpen} 
          onClose={() => setIsQuoteModalOpen(false)} 
        />
      </Suspense>
      
      {/* WhatsApp Chatbot */}
      <Suspense fallback={<LoadingSpinner />}>
        <WhatsAppChatbot />
      </Suspense>
    </>
  );
};

export default PortalHome;