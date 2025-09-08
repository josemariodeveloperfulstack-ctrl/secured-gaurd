import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/components/NotificationSystem';
import ProtectedRoute from '@/components/ProtectedRoute';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AOS from 'aos';
import 'aos/dist/aos.css';

// Portal Público
import PortalHome from '@/pages/PortalHome';
import PortalVagas from '@/pages/PortalVagas';

// Sistema Administrativo
import Login from '@/pages/Login';
import Index from '@/pages/Index';
import Dashboard from '@/pages/Dashboard';
import Funcionarios from '@/pages/Funcionarios';
import Usuarios from '@/pages/Usuarios';
import Roles from '@/pages/Roles';
import Clientes from '@/pages/Clientes';
import Fornecedores from '@/pages/Fornecedores';
import Contratos from '@/pages/Contratos';
import Financeiro from '@/pages/Financeiro';
import Medicao from '@/pages/Medicao';
import ContasAPagar from '@/pages/ContasAPagar';
import ContasAReceber from '@/pages/ContasAReceber';
import FluxoCaixa from '@/pages/FluxoCaixa';
import Pagamentos from '@/pages/Pagamentos';
import RelatoriosFinanceiros from '@/pages/RelatoriosFinanceiros';
import Frota from '@/pages/Frota';
import Documentos from '@/pages/Documentos';
import DocumentosUnificados from '@/pages/DocumentosUnificados';
import EPIs from '@/pages/EPIs';
import Certificacoes from '@/pages/Certificacoes';
import RH from '@/pages/RH';
import Vagas from '@/pages/Vagas';
import Relatorios from '@/pages/Relatorios';
import Grupos from '@/pages/Grupos';
import Configuracoes from '@/pages/Configuracoes';
import Profile from '@/pages/Profile';
import Holerites from '@/pages/Holerites';
import EnvioHolerites from '@/pages/EnvioHolerites';
import PayslipView from '@/pages/PayslipView';
import Mensagens from '@/pages/Mensagens';
import GestaoMensagens from '@/pages/GestaoMensagens';
import GestaoAtendimento from '@/pages/GestaoAtendimento';
import ChatInterno from '@/pages/ChatInterno';
import NotFound from '@/pages/NotFound';
import OrdemServico from '@/pages/OrdemServico';
import FuncionarioNovo from '@/pages/FuncionarioNovo';
import Ocorrencias from '@/pages/Ocorrencias';
import CargosPage from '@/pages/Cargos';
import FuncoesPage from '@/pages/Funcoes';
import EstoqueSimplificado from '@/pages/EstoqueSimplificado';
import Estoque from '@/pages/Estoque';
import Produtos from '@/pages/Produtos';
import Movimentacoes from '@/pages/Movimentacoes';
import EstoqueRelatorios from '@/pages/EstoqueRelatorios';
import Compras from '@/pages/Compras';
import CotacoesCompras from '@/pages/CotacoesCompras';
import Suporte from '@/pages/Suporte';
import Postos from '@/pages/Postos';
import RemanejamentoPage from '@/pages/Remanejamento';
import FeriasPage from '@/pages/Ferias';
import Beneficios from '@/pages/Beneficios';
import AdmissaoDemissao from '@/pages/AdmissaoDemissao';
import Empresas from '@/pages/Empresas';
import CentrosDeCusto from '@/pages/CentrosDeCusto';

// Páginas adicionais
import Filiais from '@/pages/Filiais';
import Servicos from '@/pages/Servicos';
import Operacional from '@/pages/Operacional';

// Módulo Comercial
import Leads from '@/pages/Leads';
import Propostas from '@/pages/Propostas';
import Orcamentos from '@/pages/Orcamentos';
import CrmKanban from '@/pages/CrmKanban';
import GestaoFuncionarios from '@/pages/GestaoFuncionarios';
import AdmissaoFuncionarios from '@/pages/AdmissaoFuncionarios';

import ControleVisitasAvancado from '@/pages/ControleVisitasAvancado';
import GuiaTransporte from '@/pages/GuiaTransporte';
import RotaSemanalSupervisao from '@/pages/RotaSemanalSupervisao';
import Supervisao from '@/pages/Supervisao';
import ActivityManagement from '@/pages/ActivityManagement';
import UserProfile from '@/pages/UserProfile';

const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    // Inicializar AOS
    AOS.init({
      duration: 800,
      easing: 'ease-in-out',
      once: true,
      mirror: false,
      offset: 50,
      delay: 100
    });

    // Re-inicializar AOS quando a rota mudar
    const handleRouteChange = () => {
      AOS.refresh();
    };

    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <NotificationProvider>
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
                <AuthProvider>
                  <Routes>
                    {/* Portal Público */}
                    <Route path="/" element={<PortalHome />} />
                    <Route path="/portal" element={<PortalHome />} />
                    <Route path="/portal/vagas" element={<PortalVagas />} />
                    
                    {/* Sistema Administrativo */}
                    <Route path="/admin" element={<Navigate to="/login" replace />} />
                    <Route path="/login" element={<Login />} />
                    
                    {/* Rotas Protegidas */}
                    <Route path="/dashboard" element={
                      <ProtectedRoute>
                        <Index />
                      </ProtectedRoute>
                    } />
                    <Route path="/dashboard-home" element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/mensagens" element={
                      <ProtectedRoute>
                        <Mensagens />
                      </ProtectedRoute>
                    } />
                    {/* Módulo de Gestão de Mensagens com rotas aninhadas */}
                    <Route path="/gestao-mensagens" element={
                      <ProtectedRoute>
                        <GestaoMensagens />
                      </ProtectedRoute>
                    } />
                    <Route path="/gestao-mensagens/:page" element={
                      <ProtectedRoute>
                        <GestaoMensagens />
                      </ProtectedRoute>
                    } />

                    {/* Módulo de Gestão de Atendimento com rotas aninhadas */}
                    <Route path="/gestao-atendimento" element={
                      <ProtectedRoute>
                        <GestaoAtendimento />
                      </ProtectedRoute>
                    } />
                    <Route path="/gestao-atendimento/:page" element={
                      <ProtectedRoute>
                        <GestaoAtendimento />
                      </ProtectedRoute>
                    } />
                    <Route path="/chat-interno" element={
                      <ProtectedRoute>
                        <ChatInterno />
                      </ProtectedRoute>
                    } />
                    
                    {/* Funcionários e Operacional */}
                    <Route path="/employees" element={
                      <ProtectedRoute>
                        <Funcionarios />
                      </ProtectedRoute>
                    } />
                    <Route path="/funcionarios" element={
                      <ProtectedRoute>
                        <Funcionarios />
                      </ProtectedRoute>
                    } />
                    <Route path="/operacional" element={
                      <ProtectedRoute>
                        <Operacional />
                      </ProtectedRoute>
                    } />
                    {/* Rota para Troca de Plantão removida temporariamente */}
                    <Route path="/guia-transporte" element={
                      <ProtectedRoute>
                        <GuiaTransporte />
                      </ProtectedRoute>
                    } />
                    
                    {/* Clientes e Filiais */}
                    <Route path="/clients" element={
                      <ProtectedRoute>
                        <Clientes />
                      </ProtectedRoute>
                    } />
                    <Route path="/clientes" element={
                      <ProtectedRoute>
                        <Clientes />
                      </ProtectedRoute>
                    } />
                    <Route path="/fornecedores" element={
                      <ProtectedRoute>
                        <Fornecedores />
                      </ProtectedRoute>
                    } />
                    <Route path="/filiais" element={
                      <ProtectedRoute>
                        <Filiais />
                      </ProtectedRoute>
                    } />
                    
                    {/* Contratos e Serviços */}
                    <Route path="/contracts" element={
                      <ProtectedRoute>
                        <Contratos />
                      </ProtectedRoute>
                    } />
                    <Route path="/contratos" element={
                      <ProtectedRoute>
                        <Contratos />
                      </ProtectedRoute>
                    } />
                    <Route path="/servicos" element={
                      <ProtectedRoute>
                        <Servicos />
                      </ProtectedRoute>
                    } />
                    
                    {/* Financeiro */}
                    <Route path="/financial" element={
                      <ProtectedRoute>
                        <Financeiro />
                      </ProtectedRoute>
                    } />
                    <Route path="/financeiro" element={
                      <ProtectedRoute>
                        <Financeiro />
                      </ProtectedRoute>
                    } />
                    <Route path="/financeiro/contas-pagar" element={
                      <ProtectedRoute>
                        <ContasAPagar />
                      </ProtectedRoute>
                    } />
                    <Route path="/financeiro/contas-receber" element={
                      <ProtectedRoute>
                        <ContasAReceber />
                      </ProtectedRoute>
                    } />
                    <Route path="/financeiro/fluxo-caixa" element={
                      <ProtectedRoute>
                        <FluxoCaixa />
                      </ProtectedRoute>
                    } />
                    <Route path="/financeiro/pagamentos" element={
                      <ProtectedRoute>
                        <Pagamentos />
                      </ProtectedRoute>
                    } />
                    <Route path="/financeiro/relatorios" element={
                      <ProtectedRoute>
                        <RelatoriosFinanceiros />
                      </ProtectedRoute>
                    } />
                    <Route path="/financeiro/centro-custos" element={
                      <ProtectedRoute>
                        <CentrosDeCusto />
                      </ProtectedRoute>
                    } />
                    <Route path="/financeiro/medicao" element={
                      <ProtectedRoute>
                        <Medicao />
                      </ProtectedRoute>
                    } />
                    
                    {/* Contas a Pagar */}
                    <Route path="/contas-a-pagar" element={
                      <ProtectedRoute>
                        <ContasAPagar />
                      </ProtectedRoute>
                    } />
                    
                    {/* Frota */}
                    <Route path="/fleet" element={
                      <ProtectedRoute>
                        <Frota />
                      </ProtectedRoute>
                    } />
                    <Route path="/frota" element={
                      <ProtectedRoute>
                        <Frota />
                      </ProtectedRoute>
                    } />
                    
                    {/* Estoque */}
                    <Route path="/inventory" element={
                      <ProtectedRoute>
                        <Estoque />
                      </ProtectedRoute>
                    } />
                    <Route path="/estoque" element={
                      <ProtectedRoute>
                        <Estoque />
                      </ProtectedRoute>
                    } />
                    <Route path="/estoque/produtos" element={
                      <ProtectedRoute>
                        <Produtos />
                      </ProtectedRoute>
                    } />
                    <Route path="/estoque/movimentacoes" element={
                      <ProtectedRoute>
                        <Movimentacoes />
                      </ProtectedRoute>
                    } />
                    <Route path="/estoque/relatorios" element={
                      <ProtectedRoute>
                        <EstoqueRelatorios />
                      </ProtectedRoute>
                    } />
                    
                    {/* Estoque Simplificado */}
                    <Route path="/estoque-simplificado" element={
                      <ProtectedRoute>
                        <EstoqueSimplificado />
                      </ProtectedRoute>
                    } />
                    
                    {/* Compras */}
                    <Route path="/compras" element={
                      <ProtectedRoute>
                        <Compras />
                      </ProtectedRoute>
                    } />
                    <Route path="/compras/cotacoes" element={
                      <ProtectedRoute>
                        <CotacoesCompras />
                      </ProtectedRoute>
                    } />
                    <Route path="/purchase" element={
                      <ProtectedRoute>
                        <Compras />
                      </ProtectedRoute>
                    } />
                    
                    {/* Suporte */}
                    <Route path="/suporte" element={
                      <ProtectedRoute>
                        <Suporte />
                      </ProtectedRoute>
                    } />
                    <Route path="/support" element={
                      <ProtectedRoute>
                        <Suporte />
                      </ProtectedRoute>
                    } />
                    
                    {/* Documentos */}
                    <Route path="/documents" element={
                      <ProtectedRoute>
                        <Documentos />
                      </ProtectedRoute>
                    } />
                    <Route path="/documentos" element={
                      <ProtectedRoute>
                        <Documentos />
                      </ProtectedRoute>
                    } />
                    
                    {/* Documentos Unificados */}
                    <Route path="/documentos-unificados" element={
                      <ProtectedRoute>
                        <DocumentosUnificados />
                      </ProtectedRoute>
                    } />
                    
                    {/* EPIs */}
                    <Route path="/epis" element={
                      <ProtectedRoute>
                        <EPIs />
                      </ProtectedRoute>
                    } />
                    
                    {/* Certificações */}
                    <Route path="/certificacoes" element={
                      <ProtectedRoute>
                        <Certificacoes />
                      </ProtectedRoute>
                    } />
                    
                    {/* RH / Departamento Pessoal */}
                    <Route path="/rh" element={
                      <ProtectedRoute>
                        <RH />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/funcionarios" element={
                      <ProtectedRoute>
                        <Funcionarios />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/funcionarios/novo" element={
                      <ProtectedRoute>
                        <FuncionarioNovo />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/ordens-servico" element={
                      <ProtectedRoute>
                        <OrdemServico />
                      </ProtectedRoute>
                    } />
                    <Route path="/ocorrencias" element={
                      <ProtectedRoute>
                        <Ocorrencias />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/ocorrencias" element={
                      <ProtectedRoute>
                        <Ocorrencias />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/cargos" element={
                      <ProtectedRoute>
                        <CargosPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/vagas" element={
                      <ProtectedRoute>
                        <Vagas />
                      </ProtectedRoute>
                    } />
                    
                    {/* Rotas RH faltantes - temporariamente redirecionando para páginas existentes */}
                    <Route path="/rh/remanejamentos" element={
                      <ProtectedRoute>
                        <RemanejamentoPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/ferias" element={
                      <ProtectedRoute>
                        <FeriasPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/beneficios" element={
                      <ProtectedRoute>
                        <Beneficios />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/funcoes" element={
                      <ProtectedRoute>
                        <FuncoesPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/postos" element={
                      <ProtectedRoute>
                        <Postos />
                      </ProtectedRoute>
                    } />
                    <Route path="/postos" element={
                      <ProtectedRoute>
                        <Postos />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/admissao-funcionarios" element={
                      <ProtectedRoute>
                        <AdmissaoFuncionarios />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/admissao-demissao" element={
                      <ProtectedRoute>
                        <AdmissaoDemissao />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/lgpd" element={
                      <ProtectedRoute>
                        <Documentos />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/relatorios" element={
                      <ProtectedRoute>
                        <Relatorios />
                      </ProtectedRoute>
                    } />
                    
                    {/* Relatórios */}
                    <Route path="/reports" element={
                      <ProtectedRoute>
                        <Relatorios />
                      </ProtectedRoute>
                    } />
                    <Route path="/relatorios" element={
                      <ProtectedRoute>
                        <Relatorios />
                      </ProtectedRoute>
                    } />
                    
                    {/* Módulo Comercial */}
                    <Route path="/leads" element={
                      <ProtectedRoute>
                        <Leads />
                      </ProtectedRoute>
                    } />
                    <Route path="/propostas" element={
                      <ProtectedRoute>
                        <Propostas />
                      </ProtectedRoute>
                    } />
                    <Route path="/orcamentos" element={
                      <ProtectedRoute>
                        <Orcamentos />
                      </ProtectedRoute>
                    } />
                    
                    {/* Gestão de Atividades - Exclusivo SUPER_ADMIN */}
                    <Route path="/atividades" element={
                      <ProtectedRoute>
                        <ActivityManagement />
                      </ProtectedRoute>
                    } />
                    
                    {/* Grupos */}
                    <Route path="/grupos" element={
                      <ProtectedRoute>
                        <Grupos />
                      </ProtectedRoute>
                    } />
                    
                    {/* Configurações */}
                    <Route path="/settings" element={
                      <ProtectedRoute>
                        <Configuracoes />
                      </ProtectedRoute>
                    } />
                    <Route path="/configuracoes" element={
                      <ProtectedRoute>
                        <Configuracoes />
                      </ProtectedRoute>
                    } />
                    
                    {/* Perfil */}
                    <Route path="/profile" element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    } />
                    <Route path="/perfil" element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    } />
                    
                    {/* Holerites */}
                    <Route path="/payslips" element={
                      <ProtectedRoute>
                        <Holerites />
                      </ProtectedRoute>
                    } />
                    <Route path="/holerites" element={
                      <ProtectedRoute>
                        <Holerites />
                      </ProtectedRoute>
                    } />
                    <Route path="/envio-holerites" element={
                      <ProtectedRoute>
                        <EnvioHolerites />
                      </ProtectedRoute>
                    } />
                    <Route path="/payslip" element={
                      <ProtectedRoute>
                        <PayslipView />
                      </ProtectedRoute>
                    } />
                    
                    {/* Usuarios */}
                    <Route path="/usuarios" element={
                      <ProtectedRoute>
                        <Usuarios />
                      </ProtectedRoute>
                    } />
                    
                    {/* Roles */}
                    <Route path="/roles" element={
                      <ProtectedRoute>
                        <Roles />
                      </ProtectedRoute>
                    } />
                    
                    {/* CRM Comercial */}
                    <Route path="/crm" element={
                      <ProtectedRoute>
                        <CrmKanban />
                      </ProtectedRoute>
                    } />
                    


                    {/* Controle de Visitas Avançado */}
                    <Route path="/controle-visitas-avancado" element={
                      <ProtectedRoute>
                        <ControleVisitasAvancado />
                      </ProtectedRoute>
                    } />
                    
                    {/* Rota Semanal de Supervisão */}
                    <Route path="/rota-semanal-supervisao" element={
                      <ProtectedRoute>
                        <RotaSemanalSupervisao />
                      </ProtectedRoute>
                    } />
                    
                    {/* ===== SISTEMA DE SUPERVISÃO ===== */}
                    <Route path="/supervisao" element={
                      <ProtectedRoute>
                        <Supervisao />
                      </ProtectedRoute>
                    } />
                    <Route path="/supervisao/visitas" element={
                      <ProtectedRoute>
                        <ControleVisitasAvancado />
                      </ProtectedRoute>
                    } />
                    <Route path="/supervisao/rotas" element={
                      <ProtectedRoute>
                        <RotaSemanalSupervisao />
                      </ProtectedRoute>
                    } />
                    <Route path="/supervisao/relatorios" element={
                      <ProtectedRoute>
                        <Relatorios />
                      </ProtectedRoute>
                    } />
                    <Route path="/supervisao/biometria" element={
                      <ProtectedRoute>
                        <Configuracoes />
                      </ProtectedRoute>
                    } />
                    
                    {/* Login Facial */}
                    <Route path="/facial-login" element={
                      <ProtectedRoute>
                        <Supervisao />
                      </ProtectedRoute>
                    } />
                    
                    {/* Perfil do Usuário */}
                    <Route path="/user-profile" element={
                      <ProtectedRoute>
                        <UserProfile />
                      </ProtectedRoute>
                    } />
                    
                    {/* RH - Gestão de Funcionários */}
                    <Route path="/rh/gestao-funcionarios" element={
                      <ProtectedRoute>
                        <GestaoFuncionarios />
                      </ProtectedRoute>
                    } />
                    
                    {/* Contas a Pagar */}
                    <Route path="/contas-a-pagar" element={
                      <ProtectedRoute>
                        <ContasAPagar />
                      </ProtectedRoute>
                    } />
                    
                    {/* Empresas */}
                    <Route path="/empresas" element={
                      <ProtectedRoute>
                        <Empresas />
                      </ProtectedRoute>
                    } />
                    {/* Centros de Custo */}
                    <Route path="/centros-de-custo" element={
                      <ProtectedRoute>
                        <CentrosDeCusto />
                      </ProtectedRoute>
                    } />
                    
                    {/* Movimentações */}
                    <Route path="/movimentacoes" element={
                      <ProtectedRoute>
                        <Movimentacoes />
                      </ProtectedRoute>
                    } />
                    
                    {/* Rota 404 */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  <Toaster />
                </AuthProvider>
              </BrowserRouter>
            </NotificationProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
