import React, { useEffect, Suspense, lazy } from 'react';
import type { UserRole } from '@/types/user';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from '@/contexts/AuthContext';
import WebSocketConnector from '@/components/WebSocketConnector';
import { NotificationProvider } from '@/components/NotificationSystem';
import ProtectedRoute from '@/components/ProtectedRoute';
import { SessionTimeoutManager } from '@/components/SessionTimeoutManager';

import ErrorBoundary from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { AppUpdateNotifier } from '@/components/AppUpdateNotifier';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import LoadingSpinner from '@/components/LoadingSpinner';
import '@/styles/gsap-animations.css';

// Registrar plugins GSAP
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/** Acesso ao módulo Comercial (rotas + CRUD contratos) quando o mapa de permissões do JWT estiver incompleto */
const COMMERCIAL_FULL_ACCESS_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'GESTOR',
  'COMERCIAL',
  'GESTOR_COMERCIAL',
  'ASSISTENTE_COMERCIAL',
];

// Portal Público - Carregamento imediato (página inicial)
import PortalHome from '@/pages/PortalHome';
import PortalVagas from '@/pages/PortalVagas';
import QuemSomos from '@/pages/QuemSomos';
import ServicosPublico from '@/pages/Servicos';
import PoliticasPrivacidade from '@/pages/PoliticasPrivacidade';
import TermosCondicoes from '@/pages/TermosCondicoes';
import Contato from '@/pages/Contato';
import CookieConsent from '@/components/CookieConsent';
import UnificadosPorSetor from '@/pages/UnificadosPorSetor';

// Helper function para lazy loading com retry
const lazyWithRetry = (componentImport: () => Promise<any>, componentName: string, maxRetries = 3) => {
  return lazy(async () => {
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Tentativa ${attempt}/${maxRetries} de carregar ${componentName}...`);
        const module = await Promise.race([
          componentImport(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout após 30 segundos')), 30000)
          )
        ]);
        console.log(`✅ ${componentName} carregado com sucesso na tentativa ${attempt}`);
        return module;
      } catch (error: any) {
        lastError = error;
        console.error(`❌ Erro na tentativa ${attempt}/${maxRetries} ao carregar ${componentName}:`, error);

        // Se for erro de rede/timeout, aguarda antes de tentar novamente
        if (
          (error instanceof TypeError && error.message.includes('Failed to fetch')) ||
          error.message.includes('Timeout') ||
          error.message.includes('522') ||
          error.message.includes('NetworkError')
        ) {
          if (attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Backoff exponencial, max 5s
            console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        } else {
          // Para outros erros, não tenta novamente
          break;
        }
      }
    }

    // Se todas as tentativas falharam
    console.error(`❌ Falha ao carregar ${componentName} após ${maxRetries} tentativas`);

    return {
      default: () => (
        <div className="flex items-center justify-center min-h-screen bg-seguranca-black">
          <div className="text-center p-8 bg-seguranca-graphite rounded-lg border border-red-500 max-w-md">
            <h2 className="text-xl font-bold text-red-500 mb-4">Erro ao carregar {componentName}</h2>
            <p className="text-seguranca-lightgray mb-4">
              Não foi possível carregar o módulo após {maxRetries} tentativas.
            </p>
            {lastError && (
              <p className="text-sm text-gray-400 mb-4">
                {lastError.message || 'Erro desconhecido'}
              </p>
            )}
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Recarregar Página
              </button>
              <button
                onClick={() => {
                  // Limpa cache e recarrega
                  if ('caches' in window) {
                    caches.keys().then(names => {
                      names.forEach(name => caches.delete(name));
                      window.location.reload();
                    });
                  } else {
                    window.location.reload();
                  }
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Limpar Cache e Recarregar
              </button>
            </div>
          </div>
        </div>
      )
    };
  });
};

// Sistema Administrativo - Lazy loading para páginas administrativas
const Login = lazy(() => import('@/pages/Login').catch(() => ({ default: () => <div>Erro ao carregar Login</div> })));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword').catch(() => ({ default: () => <div>Erro ao carregar Recuperação de Senha</div> })));
const ResetPassword = lazy(() => import('@/pages/ResetPassword').catch(() => ({ default: () => <div>Erro ao carregar Redefinição de Senha</div> })));
const FirstAccessChangePassword = lazy(() => import('@/pages/FirstAccessChangePassword').catch(() => ({ default: () => <div>Erro ao carregar Primeiro Acesso</div> })));
const FirstAccessActivate2FA = lazy(() => import('@/pages/FirstAccessActivate2FA').catch(() => ({ default: () => <div>Erro ao carregar Ativação 2FA</div> })));
const LgpdConsent = lazy(() => import('@/pages/LgpdConsent').catch(() => ({ default: () => <div>Erro ao carregar Consentimento LGPD</div> })));
const Index = lazy(() => import('@/pages/Index').catch(() => ({ default: () => <div>Erro ao carregar Index</div> })));
const Dashboard = lazy(() => import('@/pages/Dashboard').catch(() => ({ default: () => <div>Erro ao carregar Dashboard</div> })));
const DashboardColaborador = lazy(() => import('@/pages/DashboardColaborador'));
const DashboardVigilante = lazy(() => import('@/pages/DashboardVigilante'));
const Funcionarios = lazyWithRetry(() => import('@/pages/Funcionarios'), 'Funcionarios');
const Usuarios = lazy(() => import('@/pages/Usuarios'));
const Roles = lazy(() => import('@/pages/Roles'));
const Clientes = lazyWithRetry(() => import('@/pages/Clientes'), 'Clientes');
const Fornecedores = lazy(() => import('@/pages/Fornecedores'));
const GestaoPatrimonial = lazy(() => import('@/pages/GestaoPatrimonial'));
const ModuloFiscal = lazy(() => import('@/pages/ModuloFiscal'));
const Contratos = lazy(() => import('@/pages/Contratos'));
const Financeiro = lazy(() => import('@/pages/Financeiro').catch(() => ({ default: () => <div>Erro ao carregar Financeiro</div> })));
const Medicao = lazy(() => import('@/pages/Medicao'));
const ContasAPagar = lazy(() => import('@/pages/ContasAPagar'));
const ContasAReceber = lazy(() => import('@/pages/ContasAReceber'));
const FluxoCaixa = lazy(() => import('@/pages/FluxoCaixa'));
const Pagamentos = lazy(() => import('@/pages/Pagamentos'));
const ConciliacaoBancaria = lazy(() => import('@/pages/ConciliacaoBancaria'));
const RelatoriosFinanceiros = lazy(() => import('@/pages/RelatoriosFinanceiros'));
const Bancos = lazy(() => import('@/pages/Bancos'));
const Agencias = lazy(() => import('@/pages/Agencias'));
const Frota = lazy(() => import('@/pages/Frota'));
const Documentos = lazy(() => import('@/pages/Documentos'));
const DocumentosUnificados = lazy(() => import('@/pages/DocumentosUnificados'));
const EPIs = lazy(() => import('@/pages/EPIs'));
const FichasEntregaEPI = lazy(() => import('@/pages/FichasEntregaEPI'));
const Certificacoes = lazy(() => import('@/pages/Certificacoes'));
const RH = lazy(() => import('@/pages/RH'));
const Departamentos = lazy(() => import('@/pages/RH/Departamentos'));
const SST = lazy(() => import('@/pages/RH/SST'));
const SSTEPIs = lazy(() => import('@/pages/RH/SST/EPIs'));
const SSTExamesMedicos = lazy(() => import('@/pages/RH/SST/ExamesMedicos'));
const SSTAcidentes = lazy(() => import('@/pages/RH/SST/Acidentes'));
const SSTRelatorios = lazy(() => import('@/pages/RH/SST/Relatorios'));
const SSTRiscosOcupacionais = lazy(() => import('@/pages/RH/SST/RiscosOcupacionais'));
const SSTTemplates = lazy(() => import('@/pages/RH/SST/Templates'));
const SSTCIPA = lazy(() => import('@/pages/RH/SST/CIPA'));
const SSTTreinamentos = lazy(() => import('@/pages/RH/SST/Treinamentos'));
const Treinamentos = lazy(() => import('@/pages/RH/Treinamentos'));
const PontoEletronico = lazy(() => import('@/pages/RH/PontoEletronico'));
const FechamentoHoras = lazy(() => import('@/pages/RH/FechamentoHoras'));
const Aniversariantes = lazy(() => import('@/pages/RH/Aniversariantes'));
const FechamentoHorasDetalhes = lazy(() => import('@/pages/RH/FechamentoHorasDetalhes'));
const ImportarBatidas = lazy(() => import('@/pages/RH/ImportarBatidas'));
const AvaliacaoDesempenho = lazy(() => import('@/pages/RH/AvaliacaoDesempenho'));
const Vagas = lazy(() => import('@/pages/Vagas'));
const Relatorios = lazy(() => import('@/pages/Relatorios'));
const GestaoDocumentos = lazy(() => import('@/pages/GestaoDocumentos'));
const Grupos = lazyWithRetry(() => import('@/pages/Grupos'), 'Grupos');
const Configuracoes = lazy(() => import('@/pages/Configuracoes'));
const ConfiguracaoBackup = lazy(() => import('@/pages/ConfiguracaoBackup'));
const Profile = lazy(() => import('@/pages/Profile'));
const Holerites = lazy(() => import('@/pages/Holerites'));
const EnvioHolerites = lazy(() => import('@/pages/EnvioHolerites'));
const Payroll = lazy(() => import('@/pages/Payroll'));
const PayslipView = lazy(() => import('@/pages/PayslipView'));
const MeusHolerites = lazy(() => import('@/pages/MeusHolerites'));
const MeuPonto = lazy(() => import('@/pages/MeuPonto'));
const MinhasFerias = lazy(() => import('@/pages/MinhasFerias'));
const MeusPlantoes = lazy(() => import('@/pages/MeusPlantoes'));
const Mensagens = lazy(() => import('@/pages/Mensagens'));
const GestaoMensagens = lazy(() => import('@/pages/GestaoMensagens'));
const GestaoAtendimento = lazy(() => import('@/pages/GestaoAtendimento'));
const ChatInterno = lazy(() => import('@/pages/ChatInterno'));
const WhatsAppConnection = lazy(() => import('@/pages/WhatsAppConnection'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const OrdemServico = lazy(() => import('@/pages/OrdemServico'));
const FuncionarioNovo = lazy(() => import('@/pages/FuncionarioNovo'));
const Ocorrencias = lazy(() => import('@/pages/Ocorrencias'));
const CargosPage = lazy(() => import('@/pages/Cargos'));
const FuncoesPage = lazy(() => import('@/pages/Funcoes'));
const EstoqueSimplificado = lazy(() => import('@/pages/EstoqueSimplificado'));
const Estoque = lazy(() => import('@/pages/Estoque'));
const Produtos = lazy(() => import('@/pages/Produtos'));
const Movimentacoes = lazy(() => import('@/pages/Movimentacoes'));
const EstoqueRelatorios = lazy(() => import('@/pages/EstoqueRelatorios'));
const Empresas = lazy(() => import('@/pages/Empresas'));
const Compras = lazy(() => import('@/pages/Compras'));
const CotacoesCompras = lazy(() => import('@/pages/CotacoesCompras'));
const AcordoRecolhimento = lazy(() => import('@/pages/AcordoRecolhimento'));
// const Suporte = lazy(() => import('@/pages/Suporte')); // REMOVIDO - substituído por Gestão de Atendimento
const Postos = lazy(() => import('@/pages/Postos'));
const RemanejamentoPage = lazy(() => import('@/pages/Remanejamento'));
const FeriasPage = lazy(() => import('@/pages/Ferias'));
const Beneficios = lazy(() => import('@/pages/Beneficios'));
const AdmissaoDemissao = lazy(() => import('@/pages/AdmissaoDemissao'));
const CentrosDeCusto = lazy(() => import('@/pages/CentrosDeCusto'));
const ImportarDadosBancarios = lazy(() => import('@/pages/ImportarDadosBancarios'));
const ImportarWhatsappPDF = lazy(() => import('@/pages/ImportarWhatsappPDF'));

// Páginas adicionais
const Filiais = lazy(() => import('@/pages/Filiais'));
const GestaoServicos = lazy(() => import('@/pages/GestaoServicos'));
const Operacional = lazy(() => import('@/pages/Operacional'));
const ControleRondas = lazy(() => import('@/pages/ControleRondas'));

// Módulo Comercial
const Leads = lazy(() => import('@/pages/Leads'));
const Propostas = lazy(() => import('@/pages/Propostas'));
const Orcamentos = lazy(() => import('@/pages/Orcamentos'));
const CrmKanban = lazy(() => import('@/pages/CrmKanban'));
const GestaoFuncionarios = lazy(() => import('@/pages/GestaoFuncionarios'));
const AdmissaoFuncionarios = lazy(() => import('@/pages/AdmissaoFuncionarios'));

const ControleVisitasAvancado = lazy(() => import('@/pages/ControleVisitasAvancado'));
const GestaoVisitasSupervisor = lazy(() => import('@/pages/GestaoVisitasSupervisor'));
const GuiaTransporte = lazy(() => import('@/pages/GuiaTransporte'));
const RotaSemanalSupervisao = lazy(() => import('@/pages/RotaSemanalSupervisao'));
const Supervisao = lazy(() => import('@/pages/Supervisao'));
const RemoteSignaturePage = lazy(() => import('@/pages/RemoteSignaturePage'));
const DeliveryManagement = lazy(() => import('@/components/estoque/DeliveryManagement'));
const WebmailApp = lazy(() => import('@/pages/Webmail/WebmailApp'));
const EmployeePortal = lazy(() => import('@/pages/EmployeePortal'));
const ActivityManagement = lazy(() => import('@/pages/ActivityManagement'));
const UserProfile = lazy(() => import('@/pages/UserProfile'));

// Módulo Operacional (Páginas restauradas com caminhos corrigidos)
const OperacionalDashboard = lazy(() => import('@/pages/OperacionalDashboard'));
const GestaoPostos = lazy(() => import('@/pages/GestaoPostos'));
const GestaoEscalas = lazy(() => import('@/pages/GestaoEscalas'));
const GestaoFerias = lazy(() => import('@/pages/GestaoFerias'));
const GestaoTarefas = lazy(() => import('@/pages/GestaoTarefas'));
const RelatoriosOperacionais = lazy(() => import('@/pages/RelatoriosOperacionais'));
const ApuracaoHoras = lazy(() => import('@/pages/operacional/ApuracaoHoras'));


function App() {
  useEffect(() => {
    // Tratamento global para erros de message channel (extensões do browser)
    const handleMessageChannelError = (event: ErrorEvent) => {
      if (event.message && event.message.includes('message channel closed')) {
        console.warn('[App] Erro de message channel ignorado (provavelmente extensão do browser):', event.message);
        event.preventDefault();
        return false;
      }
    };

    // Tratamento global para promises rejeitadas
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && event.reason.message && event.reason.message.includes('message channel closed')) {
        console.warn('[App] Promise rejeitada por message channel ignorada:', event.reason.message);
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener('error', handleMessageChannelError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // GSAP já está registrado no import acima
    // ScrollTrigger será configurado nos componentes individuais via useGSAP hook
    console.log('✅ GSAP e ScrollTrigger registrados!');

    return () => {
      window.removeEventListener('error', handleMessageChannelError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
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
                  <AppUpdateNotifier />
                  <SessionTimeoutManager />
                  <WebSocketConnector />
                  <Routes>

                    {/* Portal Público */}
                    <Route path="/" element={<PortalHome />} />
                    <Route path="/portal" element={<PortalHome />} />
                    <Route path="/quem-somos" element={<QuemSomos />} />
                    <Route path="/servicos-publico" element={<ServicosPublico />} />
                    <Route path="/trabalhe-conosco" element={<PortalVagas />} />
                    <Route path="/contato" element={<Contato />} />
                    <Route path="/politicas-privacidade" element={<PoliticasPrivacidade />} />
                    <Route path="/termos-condicoes" element={<TermosCondicoes />} />
                    <Route path="/remote-sign/:token" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <RemoteSignaturePage />
                      </Suspense>
                    } />


                    {/* Sistema Administrativo */}
                    <Route path="/admin" element={<Navigate to="/login" replace />} />
                    <Route path="/sistema" element={
                      <ProtectedRoute requiredRoles={['SUPER_ADMIN']}>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Index />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/sistema/importar-whatsapp" element={
                      <ProtectedRoute>
                        <Suspense fallback={<LoadingSpinner />}>
                          <ImportarWhatsappPDF />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/login" element={
                      <Suspense fallback={
                        <div className="min-h-screen w-full bg-seguranca-black flex flex-col items-center justify-center p-4">
                          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-seguranca-yellow"></div>
                          <p className="mt-4 text-seguranca-lightgray">Carregando sistema de login...</p>
                        </div>
                      }>
                        <Login />
                      </Suspense>
                    } />
                    <Route path="/forgot-password" element={
                      <Suspense fallback={
                        <div className="min-h-screen w-full bg-seguranca-black flex flex-col items-center justify-center p-4">
                          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-seguranca-yellow"></div>
                          <p className="mt-4 text-seguranca-lightgray">Carregando recuperação de senha...</p>
                        </div>
                      }>
                        <ForgotPassword />
                      </Suspense>
                    } />
                    <Route path="/reset-password" element={
                      <Suspense fallback={
                        <div className="min-h-screen w-full bg-seguranca-black flex flex-col items-center justify-center p-4">
                          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-seguranca-yellow"></div>
                          <p className="mt-4 text-seguranca-lightgray">Carregando redefinição de senha...</p>
                        </div>
                      }>
                        <ResetPassword />
                      </Suspense>
                    } />
                    <Route path="/first-access/change-password" element={
                      <ProtectedRoute allowWithoutFirstAccess={true}>
                        <Suspense fallback={
                          <div className="min-h-screen w-full bg-seguranca-black flex flex-col items-center justify-center p-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-seguranca-yellow"></div>
                            <p className="mt-4 text-seguranca-lightgray">Carregando primeiro acesso...</p>
                          </div>
                        }>
                          <FirstAccessChangePassword />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/first-access/activate-2fa" element={
                      <Suspense fallback={
                        <div className="min-h-screen w-full bg-seguranca-black flex flex-col items-center justify-center p-4">
                          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-seguranca-yellow"></div>
                          <p className="mt-4 text-seguranca-lightgray">Carregando ativação 2FA...</p>
                        </div>
                      }>
                        <FirstAccessActivate2FA />
                      </Suspense>
                    } />
                    <Route path="/lgpd-consent" element={
                      <Suspense fallback={
                        <div className="min-h-screen w-full bg-seguranca-black flex flex-col items-center justify-center p-4">
                          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-seguranca-yellow"></div>
                          <p className="mt-4 text-seguranca-lightgray">Carregando consentimento LGPD...</p>
                        </div>
                      }>
                        <LgpdConsent />
                      </Suspense>
                    } />

                    {/* Rotas Protegidas */}
                    <Route path="/dashboard" element={
                      <ProtectedRoute>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Index />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/dashboard-home" element={
                      <ProtectedRoute>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Dashboard />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                     <Route path="/dashboard-colaborador" element={
                       <ProtectedRoute>
                         <Suspense fallback={<LoadingSpinner />}>
                           <EmployeePortal />
                         </Suspense>
                       </ProtectedRoute>
                     } />
                     <Route path="/area-funcionario" element={
                       <ProtectedRoute>
                         <Suspense fallback={<LoadingSpinner />}>
                           <EmployeePortal />
                         </Suspense>
                       </ProtectedRoute>
                     } />
                    <Route path="/dashboard-vigilante" element={
                      <ProtectedRoute>
                        <Suspense fallback={<LoadingSpinner />}>
                          <DashboardVigilante />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/mensagens" element={
                      <ProtectedRoute requiredPermissions={['MESSAGES_READ']}>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Mensagens />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    {/* Módulo de Gestão de Mensagens com rotas aninhadas */}
                    <Route path="/gestao-mensagens" element={
                      <ProtectedRoute requiredPermissions={['MESSAGES_MANAGE']}>
                        <Suspense fallback={<LoadingSpinner />}>
                          <GestaoMensagens />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/gestao-mensagens/:page" element={
                      <ProtectedRoute requiredPermissions={['MESSAGES_MANAGE']}>
                        <Suspense fallback={<LoadingSpinner />}>
                          <GestaoMensagens />
                        </Suspense>
                      </ProtectedRoute>
                    } />

                    {/* Módulo de Gestão de Atendimento com rotas aninhadas */}
                    <Route path="/gestao-atendimento" element={
                      <ProtectedRoute requiredPermissions={['ATTENDANCE_READ']}>
                        <Suspense fallback={<LoadingSpinner />}>
                          <GestaoAtendimento />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/gestao-atendimento/:page" element={
                      <ProtectedRoute requiredPermissions={['ATTENDANCE_READ']}>
                        <Suspense fallback={<LoadingSpinner />}>
                          <GestaoAtendimento />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/chat-interno" element={
                      <ProtectedRoute>
                        <Suspense fallback={<LoadingSpinner />}>
                          <ChatInterno />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/whatsapp-connection" element={
                      <ProtectedRoute requiredRoles={['SUPER_ADMIN']}>
                        <Suspense fallback={<LoadingSpinner />}>
                          <WhatsAppConnection />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/webmail" element={
                      <ProtectedRoute>
                        <Suspense fallback={<LoadingSpinner />}>
                          <WebmailApp />
                        </Suspense>
                      </ProtectedRoute>
                    } />

                    {/* Funcionários e Operacional */}
                    <Route path="/employees" element={
                      <ProtectedRoute requiredPermissions={['EMPLOYEES_READ']}>
                        <Funcionarios />
                      </ProtectedRoute>
                    } />
                    <Route path="/funcionarios" element={
                      <ProtectedRoute requiredPermissions={['EMPLOYEES_READ']}>
                        <Funcionarios />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/postos" element={
                      <ProtectedRoute requiredPermissions={['EMPLOYEES_READ']}>
                        <Postos />
                      </ProtectedRoute>
                    } />
                    <Route path="/operacional" element={
                      <ProtectedRoute requiredPermissions={['EMPLOYEES_READ']}>
                        <Operacional />
                      </ProtectedRoute>
                    } />
                    <Route path="/controle-rondas" element={
                      <ProtectedRoute>
                        <ControleRondas />
                      </ProtectedRoute>
                    } />
                    {/* Rota para Troca de Plantão removida temporariamente */}
                    <Route path="/guia-transporte" element={
                      <ProtectedRoute requiredPermissions={['EMPLOYEES_READ']}>
                        <GuiaTransporte />
                      </ProtectedRoute>
                    } />

                    {/* Clientes e Filiais */}
                    <Route path="/clients" element={
                      <ProtectedRoute requiredPermissions={['CLIENTS_READ']} requiredRoles={COMMERCIAL_FULL_ACCESS_ROLES}>
                        <Clientes />
                      </ProtectedRoute>
                    } />
                    <Route path="/clientes" element={
                      <ProtectedRoute requiredPermissions={['CLIENTS_READ']} requiredRoles={COMMERCIAL_FULL_ACCESS_ROLES}>
                        <Clientes />
                      </ProtectedRoute>
                    } />
                    <Route path="/fornecedores" element={
                      <ProtectedRoute requiredPermissions={['CLIENTS_READ', 'STOCK_READ']} requireAllPermissions={false}>
                        <Fornecedores />
                      </ProtectedRoute>
                    } />
                    <Route path="/filiais" element={
                      <ProtectedRoute requiredPermissions={['CLIENTS_READ']}>
                        <Filiais />
                      </ProtectedRoute>
                    } />
                    <Route path="/gestao-patrimonial" element={
                      <ProtectedRoute requiredPermissions={['PATRIMONIAL_READ']}>
                        <Suspense fallback={<LoadingSpinner />}>
                          <GestaoPatrimonial />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/modulo-fiscal" element={
                      <ProtectedRoute requiredPermissions={['FISCAL_READ']}>
                        <Suspense fallback={<LoadingSpinner />}>
                          <ModuloFiscal />
                        </Suspense>
                      </ProtectedRoute>
                    } />

                    {/* Contratos e Serviços */}
                    <Route path="/contracts" element={
                      <ProtectedRoute requiredPermissions={['CONTRACTS_READ']} requiredRoles={COMMERCIAL_FULL_ACCESS_ROLES}>
                        <Contratos />
                      </ProtectedRoute>
                    } />
                    <Route path="/contratos" element={
                      <ProtectedRoute requiredPermissions={['CONTRACTS_READ']} requiredRoles={COMMERCIAL_FULL_ACCESS_ROLES}>
                        <Contratos />
                      </ProtectedRoute>
                    } />
                    <Route path="/servicos" element={
                      <ProtectedRoute requiredPermissions={['CONTRACTS_READ']} requiredRoles={COMMERCIAL_FULL_ACCESS_ROLES}>
                        <Suspense fallback={<LoadingSpinner />}>
                          <GestaoServicos />
                        </Suspense>
                      </ProtectedRoute>
                    } />

                    {/* Financeiro */}
                    <Route path="/financial" element={
                      <ProtectedRoute requiredPermissions={['FINANCIAL_READ']}>
                        <Financeiro />
                      </ProtectedRoute>
                    } />
                    <Route path="/financeiro" element={
                      <ProtectedRoute requiredPermissions={['FINANCIAL_READ']}>
                        <Financeiro />
                      </ProtectedRoute>
                    } />
                    <Route path="/financeiro/contas-pagar" element={
                      <ProtectedRoute requiredPermissions={['FINANCIAL_WRITE']}>
                        <ContasAPagar />
                      </ProtectedRoute>
                    } />
                    <Route path="/financeiro/contas-receber" element={
                      <ProtectedRoute requiredPermissions={['FINANCIAL_WRITE']}>
                        <ContasAReceber />
                      </ProtectedRoute>
                    } />
                    <Route path="/financeiro/conciliacao-bancaria" element={
                      <ProtectedRoute requiredPermissions={['FINANCIAL_WRITE']}>
                        <Suspense fallback={<LoadingSpinner />}>
                          <ConciliacaoBancaria />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/financeiro/bancos" element={
                      <ProtectedRoute requiredPermissions={['FINANCIAL_READ']}>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Bancos />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/financeiro/agencias" element={
                      <ProtectedRoute requiredPermissions={['FINANCIAL_READ']}>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Agencias />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/financeiro/fluxo-caixa" element={
                      <ProtectedRoute requiredPermissions={['FINANCIAL_READ']}>
                        <FluxoCaixa />
                      </ProtectedRoute>
                    } />
                    <Route path="/financeiro/pagamentos" element={
                      <ProtectedRoute requiredPermissions={['FINANCIAL_WRITE']}>
                        <Pagamentos />
                      </ProtectedRoute>
                    } />
                    <Route path="/financeiro/relatorios" element={
                      <ProtectedRoute requiredPermissions={['FINANCIAL_READ']}>
                        <RelatoriosFinanceiros />
                      </ProtectedRoute>
                    } />
                    <Route path="/financeiro/centro-custos" element={
                      <ProtectedRoute>
                        <Suspense fallback={<LoadingSpinner />}>
                          <CentrosDeCusto />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/financeiro/medicao" element={
                      <ProtectedRoute requiredPermissions={['FINANCIAL_READ']}>
                        <Medicao />
                      </ProtectedRoute>
                    } />

                    {/* Contas a Pagar */}
                    <Route path="/contas-a-pagar" element={
                      <ProtectedRoute requiredPermissions={['FINANCIAL_WRITE']}>
                        <ContasAPagar />
                      </ProtectedRoute>
                    } />
                    <Route path="/gestao-financeira/contas-pagar" element={
                      <ProtectedRoute requiredPermissions={['FINANCIAL_READ']}>
                        <ContasAPagar />
                      </ProtectedRoute>
                    } />

                    {/* Frota */}
                    <Route path="/fleet" element={
                      <ProtectedRoute requiredPermissions={['EQUIPMENTS_READ']}>
                        <Frota />
                      </ProtectedRoute>
                    } />
                    <Route path="/frota" element={
                      <ProtectedRoute requiredPermissions={['EQUIPMENTS_READ']}>
                        <Frota />
                      </ProtectedRoute>
                    } />

                    {/* Estoque */}
                    <Route path="/inventory" element={
                      <ProtectedRoute requiredPermissions={['STOCK_READ']}>
                        <Estoque />
                      </ProtectedRoute>
                    } />
                    <Route path="/estoque" element={
                      <ProtectedRoute requiredPermissions={['STOCK_READ']}>
                        <Estoque />
                      </ProtectedRoute>
                    } />
                    <Route path="/estoque/produtos" element={
                      <ProtectedRoute requiredPermissions={['STOCK_READ']}>
                        <Produtos />
                      </ProtectedRoute>
                    } />
                    <Route path="/estoque/movimentacoes" element={
                      <ProtectedRoute requiredPermissions={['STOCK_MANAGE']}>
                        <Movimentacoes />
                      </ProtectedRoute>
                    } />
                    <Route path="/estoque/relatorios" element={
                      <ProtectedRoute requiredPermissions={['STOCK_READ']}>
                        <EstoqueRelatorios />
                      </ProtectedRoute>
                    } />
                    <Route path="/estoque/entregas" element={
                      <ProtectedRoute requiredPermissions={['STOCK_READ']}>
                        <DeliveryManagement />
                      </ProtectedRoute>
                    } />
                    <Route path="/comercial/empresas" element={
                      <ProtectedRoute requiredPermissions={['CLIENTS_READ']}>
                        <Empresas />
                      </ProtectedRoute>
                    } />
                    <Route path="/estoque/fornecedores" element={
                      <ProtectedRoute requiredPermissions={['CLIENTS_READ', 'STOCK_READ']} requireAllPermissions={false}>
                        <Fornecedores />
                      </ProtectedRoute>
                    } />

                    {/* Estoque Simplificado */}
                    <Route path="/estoque-simplificado" element={
                      <ProtectedRoute requiredPermissions={['STOCK_READ']}>
                        <EstoqueSimplificado />
                      </ProtectedRoute>
                    } />

                    {/* Compras */}
                    <Route path="/compras" element={
                      <ProtectedRoute requiredPermissions={['STOCK_MANAGE', 'STOCK_READ']} requireAllPermissions={false}>
                        <Compras />
                      </ProtectedRoute>
                    } />
                    <Route path="/compras/solicitacoes" element={
                      <ProtectedRoute requiredPermissions={['STOCK_MANAGE', 'STOCK_READ']} requireAllPermissions={false}>
                        <Compras />
                      </ProtectedRoute>
                    } />
                    <Route path="/compras/aprovacoes" element={
                      <ProtectedRoute requiredPermissions={['STOCK_MANAGE', 'STOCK_READ']} requireAllPermissions={false}>
                        <Compras />
                      </ProtectedRoute>
                    } />
                    <Route path="/compras/relatorios" element={
                      <ProtectedRoute requiredPermissions={['STOCK_MANAGE', 'STOCK_READ']} requireAllPermissions={false}>
                        <Compras />
                      </ProtectedRoute>
                    } />
                    <Route path="/compras/fornecedores" element={
                      <ProtectedRoute requiredPermissions={['STOCK_MANAGE', 'STOCK_READ']} requireAllPermissions={false}>
                        <Compras />
                      </ProtectedRoute>
                    } />
                    <Route path="/compras/cotacoes" element={
                      <ProtectedRoute requiredPermissions={['STOCK_MANAGE', 'STOCK_READ']} requireAllPermissions={false}>
                        <CotacoesCompras />
                      </ProtectedRoute>
                    } />
                    <Route path="/compras/acordo-recolhimento" element={
                      <ProtectedRoute requiredPermissions={['PURCHASE_AGREEMENT_READ', 'STOCK_MANAGE']}>
                        <Suspense fallback={<LoadingSpinner />}>
                          <AcordoRecolhimento />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/purchase" element={
                      <ProtectedRoute requiredPermissions={['STOCK_MANAGE']}>
                        <Compras />
                      </ProtectedRoute>
                    } />

                    {/* Suporte - REMOVIDO (substituído por Gestão de Atendimento) */}
                    {/* <Route path="/suporte" element={
                      <ProtectedRoute>
                        <Suporte />
                      </ProtectedRoute>
                    } />
                    <Route path="/support" element={
                      <ProtectedRoute>
                        <Suporte />
                      </ProtectedRoute>
                    } /> */}

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

                    {/* Unificados por Setor */}
                    <Route path="/unificados-por-setor" element={
                      <ProtectedRoute>
                        <UnificadosPorSetor />
                      </ProtectedRoute>
                    } />

                    {/* EPIs */}
                    <Route path="/epis" element={
                      <ProtectedRoute>
                        <EPIs />
                      </ProtectedRoute>
                    } />

                    {/* Fichas de Entrega de EPI */}
                    <Route path="/fichas-entrega-epi" element={
                      <ProtectedRoute>
                        <FichasEntregaEPI />
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
                    <Route path="/rh/sst" element={
                      <ProtectedRoute>
                        <SST />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/sst/epis" element={
                      <ProtectedRoute>
                        <SSTEPIs />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/sst/epis/:id" element={
                      <ProtectedRoute>
                        <SSTEPIs />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/sst/exames" element={
                      <ProtectedRoute>
                        <SSTExamesMedicos />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/sst/acidentes" element={
                      <ProtectedRoute>
                        <Suspense fallback={<LoadingSpinner />}>
                          <SSTAcidentes />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/sst/relatorios" element={
                      <ProtectedRoute>
                        <SSTRelatorios />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/sst/riscos" element={
                      <ProtectedRoute>
                        <SSTRiscosOcupacionais />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/sst/templates" element={
                      <ProtectedRoute>
                        <SSTTemplates />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/sst/cipa" element={
                      <ProtectedRoute>
                        <SSTCIPA />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/sst/treinamentos" element={
                      <ProtectedRoute>
                        <SSTTreinamentos />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/treinamentos" element={
                      <ProtectedRoute>
                        <Treinamentos />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/ponto-eletronico" element={
                      <ProtectedRoute>
                        <Suspense fallback={<LoadingSpinner />}>
                          <PontoEletronico />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/fechamento-horas" element={
                      <ProtectedRoute>
                        <Suspense fallback={<LoadingSpinner />}>
                          <FechamentoHoras />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/fechamento-horas/:id" element={
                      <ProtectedRoute>
                        <Suspense fallback={<LoadingSpinner />}>
                          <FechamentoHorasDetalhes />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/fechamento-horas/importar" element={
                      <ProtectedRoute>
                        <Suspense fallback={<LoadingSpinner />}>
                          <ImportarBatidas />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/avaliacao-desempenho" element={
                      <ProtectedRoute>
                        <Suspense fallback={<LoadingSpinner />}>
                          <AvaliacaoDesempenho />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/funcionarios" element={
                      <ProtectedRoute>
                        <Funcionarios />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/departamentos" element={
                      <ProtectedRoute>
                        <Departamentos />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/funcionarios/novo" element={
                      <ProtectedRoute>
                        <FuncionarioNovo />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/funcionarios/importar-dados-bancarios" element={
                      <ProtectedRoute>
                        <Suspense fallback={<LoadingSpinner />}>
                          <ImportarDadosBancarios />
                        </Suspense>
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
                    <Route path="/rh/aniversariantes" element={
                      <ProtectedRoute>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Aniversariantes />
                        </Suspense>
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
                    <Route path="/rh/documentos" element={
                      <ProtectedRoute>
                        <GestaoDocumentos />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/gestao-documentos" element={
                      <ProtectedRoute>
                        <GestaoDocumentos />
                      </ProtectedRoute>
                    } />
                    <Route path="/rh/epis" element={
                      <ProtectedRoute>
                        <EPIs />
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
                      <ProtectedRoute requiredPermissions={['LEADS_READ']} requiredRoles={COMMERCIAL_FULL_ACCESS_ROLES}>
                        <Leads />
                      </ProtectedRoute>
                    } />
                    <Route path="/propostas" element={
                      <ProtectedRoute requiredPermissions={['PROPOSALS_READ']} requiredRoles={COMMERCIAL_FULL_ACCESS_ROLES}>
                        <Propostas />
                      </ProtectedRoute>
                    } />
                    <Route path="/orcamentos" element={
                      <ProtectedRoute requiredPermissions={['QUOTES_READ']} requiredRoles={COMMERCIAL_FULL_ACCESS_ROLES}>
                        <Orcamentos />
                      </ProtectedRoute>
                    } />

                    {/* Gestão de Atividades - Exclusivo SUPER_ADMIN */}
                    <Route path="/atividades" element={
                      <ProtectedRoute requiredRoles={['SUPER_ADMIN']}>
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
                      <ProtectedRoute requiredRoles={['SUPER_ADMIN']}>
                        <Configuracoes />
                      </ProtectedRoute>
                    } />
                    <Route path="/configuracoes/backup" element={
                      <ProtectedRoute requiredRoles={['SUPER_ADMIN']}>
                        <Suspense fallback={<LoadingSpinner />}>
                          <ConfiguracaoBackup />
                        </Suspense>
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
                      <ProtectedRoute requiredPermissions={['PAYSLIPS_READ']}>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Holerites />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/holerites" element={
                      <ProtectedRoute requiredPermissions={['PAYSLIPS_READ']}>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Holerites />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/meus-holerites" element={
                      <ProtectedRoute>
                        <Suspense fallback={<LoadingSpinner />}>
                          <MeusHolerites />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/meu-ponto" element={
                      <ProtectedRoute>
                        <Suspense fallback={<LoadingSpinner />}>
                          <MeuPonto />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/minhas-ferias" element={
                      <ProtectedRoute>
                        <Suspense fallback={<LoadingSpinner />}>
                          <MinhasFerias />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/meus-plantoes" element={
                      <ProtectedRoute>
                        <Suspense fallback={<LoadingSpinner />}>
                          <MeusPlantoes />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/envio-holerites" element={
                      <ProtectedRoute>
                        <EnvioHolerites />
                      </ProtectedRoute>
                    } />
                    <Route path="/payslip" element={
                      <ProtectedRoute requiredPermissions={['PAYSLIPS_READ']}>
                        <Suspense fallback={<LoadingSpinner />}>
                          <PayslipView />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/payrolls" element={
                      <ProtectedRoute>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Payroll />
                        </Suspense>
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
                      <ProtectedRoute requiredPermissions={['LEADS_READ']} requiredRoles={COMMERCIAL_FULL_ACCESS_ROLES}>
                        <CrmKanban />
                      </ProtectedRoute>
                    } />



                    {/* Controle de Visitas Avançado */}
                    <Route path="/controle-visitas-avancado" element={
                      <ProtectedRoute requiredPermissions={['EMPLOYEES_READ']}>
                        <ControleVisitasAvancado />
                      </ProtectedRoute>
                    } />

                    {/* Gestão de Visitas de Supervisor */}
                    <Route path="/gestao-visitas-supervisor" element={
                      <ProtectedRoute requiredPermissions={['EMPLOYEES_READ']}>
                        <GestaoVisitasSupervisor />
                      </ProtectedRoute>
                    } />

                    {/* Rota Semanal de Supervisão */}
                    <Route path="/rota-semanal-supervisao" element={
                      <ProtectedRoute requiredPermissions={['EMPLOYEES_READ']}>
                        <RotaSemanalSupervisao />
                      </ProtectedRoute>
                    } />

                    {/* ===== SISTEMA DE SUPERVISÃO ===== */}
                    <Route path="/supervisao" element={
                      <ProtectedRoute requiredPermissions={['EMPLOYEES_READ']}>
                        <Supervisao />
                      </ProtectedRoute>
                    } />
                    <Route path="/supervisao/visitas" element={
                      <ProtectedRoute requiredPermissions={['EMPLOYEES_READ']}>
                        <ControleVisitasAvancado />
                      </ProtectedRoute>
                    } />
                    <Route path="/supervisao/rotas" element={
                      <ProtectedRoute requiredPermissions={['EMPLOYEES_READ']}>
                        <RotaSemanalSupervisao />
                      </ProtectedRoute>
                    } />
                    <Route path="/supervisao/relatorios" element={
                      <ProtectedRoute requiredPermissions={['EMPLOYEES_READ']}>
                        <Relatorios />
                      </ProtectedRoute>
                    } />
                    <Route path="/supervisao/biometria" element={
                      <ProtectedRoute requiredPermissions={['EMPLOYEES_READ']}>
                        <Configuracoes />
                      </ProtectedRoute>
                    } />

                    {/* Login Facial */}
                    <Route path="/facial-login" element={
                      <ProtectedRoute requiredPermissions={['EMPLOYEES_READ']}>
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
                      <ProtectedRoute requiredPermissions={['CLIENTS_READ']} requiredRoles={COMMERCIAL_FULL_ACCESS_ROLES}>
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
                      <ProtectedRoute requiredPermissions={['STOCK_MANAGE']}>
                        <Movimentacoes />
                      </ProtectedRoute>
                    } />

                    {/* Módulo Operacional */}
                    <Route path="/operacional-dashboard" element={
                      <ProtectedRoute>
                        <Suspense fallback={<LoadingSpinner />}>
                          <OperacionalDashboard />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/operacional/postos" element={
                      <ProtectedRoute>
                        <Suspense fallback={<LoadingSpinner />}>
                          <GestaoPostos />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/operacional/escalas" element={
                      <ProtectedRoute>
                        <Suspense fallback={<LoadingSpinner />}>
                          <GestaoEscalas />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/operacional/ferias" element={
                      <ProtectedRoute>
                        <Suspense fallback={<LoadingSpinner />}>
                          <GestaoFerias />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/operacional/tarefas" element={
                      <ProtectedRoute>
                        <Suspense fallback={<LoadingSpinner />}>
                          <GestaoTarefas />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/operacional/relatorios" element={
                      <ProtectedRoute>
                        <Suspense fallback={<LoadingSpinner />}>
                          <RelatoriosOperacionais />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/operacional/apuracao-horas" element={
                      <ProtectedRoute>
                        <Suspense fallback={<LoadingSpinner />}>
                          <ApuracaoHoras />
                        </Suspense>
                      </ProtectedRoute>
                    } />

                    {/* Rota 404 */}
                    <Route path="*" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <NotFound />
                      </Suspense>
                    } />
                  </Routes>
                  <Toaster />
                  <CookieConsent />
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
