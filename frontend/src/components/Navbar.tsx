import React, { useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
// import logoImage from '@/assets/logo.svg';

const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="shadow-lg border-b border-gray-700 sticky top-0 z-50" style={{ backgroundColor: '#292929' }}>
      <div className="container mx-auto px-4 py-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <a href="/" className="flex items-center">
              <img src="/promover-logo.png" alt="Promover Vigilância" className="h-12 w-auto" />
            </a>
          </div>
          
          {/* Menu para desktop */}
          <nav className="hidden md:flex space-x-6">
            <a href="#inicio" className="text-gray-300 hover:text-white transition-colors font-medium">Home</a>
            <a href="#quem-somos" className="text-gray-300 hover:text-white transition-colors font-medium">Quem Somos</a>
            <a href="#servicos" className="text-gray-300 hover:text-white transition-colors font-medium">Serviços</a>
            <a href="/portal/vagas" className="text-gray-300 hover:text-white transition-colors font-medium">Trabalhe Conosco</a>
            <a href="#contato" className="text-gray-300 hover:text-white transition-colors font-medium">Contato</a>
          </nav>
          
          {/* Botões para desktop */}
          <div className="hidden md:flex items-center gap-2">
            <a href="/login" className="text-black hover:text-gray-800 transition-colors font-medium px-3 py-1 rounded" style={{ backgroundColor: '#FFF600' }}>Área Administrativa</a>
            <Button className="bg-red-600 hover:bg-red-700">
              Solicitar Orçamento
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
          
          {/* Botão do menu mobile */}
          <button 
            className="md:hidden text-white p-2" 
            onClick={toggleMobileMenu}
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        
        {/* Menu mobile */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-700">
            <nav className="flex flex-col space-y-3">
              <a href="#inicio" className="text-gray-300 hover:text-white transition-colors font-medium px-2 py-1">Home</a>
              <a href="#quem-somos" className="text-gray-300 hover:text-white transition-colors font-medium px-2 py-1">Quem Somos</a>
              <a href="#servicos" className="text-gray-300 hover:text-white transition-colors font-medium px-2 py-1">Serviços</a>
              <a href="/portal/vagas" className="text-gray-300 hover:text-white transition-colors font-medium px-2 py-1">Trabalhe Conosco</a>
              <a href="#contato" className="text-gray-300 hover:text-white transition-colors font-medium px-2 py-1">Contato</a>
              <div className="flex flex-col space-y-2 pt-2">
                <a href="/login" className="text-black hover:text-gray-800 transition-colors font-medium px-3 py-2 rounded text-center" style={{ backgroundColor: '#FFF600' }}>Área Administrativa</a>
                <Button className="bg-red-600 hover:bg-red-700 w-full">
                  Solicitar Orçamento
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
