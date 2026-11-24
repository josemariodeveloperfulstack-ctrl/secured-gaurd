import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Home, ArrowLeft, LucideIcon } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: LucideIcon;
}

const breadcrumbMap: Record<string, BreadcrumbItem[]> = {
  '/dashboard': [
    { label: 'Dashboard', path: '/dashboard', icon: Home }
  ],
  '/crm': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Comercial', path: '/leads' },
    { label: 'CRM Comercial', path: '/crm' }
  ],
  '/comercial/prospeccao': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Comercial', path: '/leads' },
    { label: 'Prospecção de Leads', path: '/comercial/prospeccao' }
  ],
  '/comercial/marketing': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Comercial', path: '/leads' },
    { label: 'Marketing', path: '/comercial/marketing' }
  ],
  '/leads': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Comercial', path: '/leads' },
    { label: 'Leads', path: '/leads' }
  ],
  '/clientes': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Comercial', path: '/clientes' },
    { label: 'Clientes', path: '/clientes' }
  ],
  '/propostas': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Comercial', path: '/propostas' },
    { label: 'Propostas', path: '/propostas' }
  ],
  '/orcamentos': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Comercial', path: '/orcamentos' },
    { label: 'Orçamentos', path: '/orcamentos' }
  ],
  '/contratos': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Comercial', path: '/contratos' },
    { label: 'Contratos', path: '/contratos' }
  ],
  '/funcionarios': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'RH', path: '/rh' },
    { label: 'Funcionários', path: '/funcionarios' }
  ],
  '/funcionarios/novo': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'RH', path: '/rh' },
    { label: 'Funcionários', path: '/funcionarios' },
    { label: 'Novo Funcionário', path: '/funcionarios/novo' }
  ],
  '/rh': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'RH', path: '/rh' }
  ],
  '/rh/departamentos': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'RH', path: '/rh' },
    { label: 'Departamentos', path: '/rh/departamentos' }
  ],
  '/rh/sst': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'RH', path: '/rh' },
    { label: 'SST', path: '/rh/sst' }
  ],
  '/epis': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Operacional', path: '/operacional' },
    { label: 'EPIs', path: '/epis' }
  ],
  '/fichas-entrega-epi': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Operacional', path: '/operacional' },
    { label: 'Fichas de Entrega de EPI', path: '/fichas-entrega-epi' }
  ],
  '/estoque': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Operacional', path: '/operacional' },
    { label: 'Estoque', path: '/estoque' }
  ],
  '/estoque-simplificado': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Operacional', path: '/operacional' },
    { label: 'Estoque Simplificado', path: '/estoque-simplificado' }
  ],
  '/produtos': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Operacional', path: '/operacional' },
    { label: 'Produtos', path: '/produtos' }
  ],
  '/movimentacoes': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Operacional', path: '/operacional' },
    { label: 'Movimentações', path: '/movimentacoes' }
  ],
  '/operacional': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Operacional', path: '/operacional' }
  ],
  '/ordem-servico': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Operacional', path: '/operacional' },
    { label: 'Ordens de Serviço', path: '/ordem-servico' }
  ],
  '/ocorrencias': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Operacional', path: '/operacional' },
    { label: 'Ocorrências', path: '/ocorrencias' }
  ],
  '/rondas': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Operacional', path: '/operacional' },
    { label: 'Controle de Rondas', path: '/rondas' }
  ],
  '/financeiro': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Financeiro', path: '/financeiro' }
  ],
  '/contas-pagar': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Financeiro', path: '/financeiro' },
    { label: 'Contas a Pagar', path: '/contas-pagar' }
  ],
  '/contas-receber': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Financeiro', path: '/financeiro' },
    { label: 'Contas a Receber', path: '/contas-receber' }
  ],
  '/fluxo-caixa': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Financeiro', path: '/financeiro' },
    { label: 'Fluxo de Caixa', path: '/fluxo-caixa' }
  ],
  '/holerites': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Holerites', path: '/holerites' }
  ],
  '/frota': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Frota', path: '/frota' }
  ],
  '/filiais': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Filiais', path: '/filiais' }
  ],
  '/configuracoes': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Configurações', path: '/configuracoes' }
  ],
  '/usuarios': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Administrativo', path: '/administrativo' },
    { label: 'Usuários', path: '/usuarios' }
  ],
  '/grupos': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Administrativo', path: '/grupos' },
    { label: 'Grupos de Usuários', path: '/grupos' }
  ],
  '/servicos': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Operacional', path: '/operacional' },
    { label: 'Serviços', path: '/servicos' }
  ],
  '/vagas': [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'RH', path: '/vagas' },
    { label: 'Vagas', path: '/vagas' }
  ],
};

export const Breadcrumb: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  // Resolve breadcrumbs: do mapa ou gera dinamicamente para rotas não mapeadas
  const resolveBreadcrumbs = (): BreadcrumbItem[] => {
    if (breadcrumbMap[pathname]) {
      return breadcrumbMap[pathname];
    }

    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) {
      return [{ label: 'Dashboard', path: '/dashboard', icon: Home }];
    }

    const items: BreadcrumbItem[] = [
      { label: 'Dashboard', path: '/dashboard', icon: Home }
    ];

    let accumulated = '';
    for (const segment of segments) {
      accumulated += `/${segment}`;
      if (accumulated === '/dashboard') continue;

      // Formatar rótulo amigável
      const formatted = segment
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

      items.push({
        label: formatted,
        path: accumulated
      });
    }

    return items;
  };

  const breadcrumbs = resolveBreadcrumbs();
  const isHomeOrDashboard = pathname === '/' || pathname === '/dashboard';

  const handleGoBack = () => {
    if (window.history.length > 1 && window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex items-center flex-wrap gap-2 text-sm text-seguranca-lightgray mb-4 min-w-0">
      {/* Botão Global de Voltar */}
      {!isHomeOrDashboard && (
        <button
          type="button"
          onClick={handleGoBack}
          aria-label="Voltar à tela anterior"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs sm:text-sm font-semibold bg-seguranca-graphite border border-gray-700 text-seguranca-lightgray hover:text-seguranca-yellow hover:border-seguranca-yellow/60 hover:bg-seguranca-black transition-all shadow-sm group shrink-0 cursor-pointer"
          title="Voltar à tela anterior"
        >
          <ArrowLeft size={15} className="text-seguranca-yellow transition-transform group-hover:-translate-x-1" />
          <span>Voltar</span>
        </button>
      )}

      {/* Trilha do Breadcrumb */}
      <nav aria-label="Navegação estrutural" className="flex items-center flex-wrap space-x-1 min-w-0">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          return (
            <React.Fragment key={`${item.path}-${index}`}>
              {index > 0 && (
                <ChevronRight size={14} className="text-gray-500 shrink-0 mx-0.5" />
              )}
              <Link
                to={item.path}
                className={`
                  flex items-center space-x-1 hover:text-seguranca-yellow transition-colors truncate max-w-[200px] sm:max-w-none
                  ${isLast ? 'text-seguranca-yellow font-semibold' : 'text-gray-400'}
                `}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.icon && <item.icon size={15} className="shrink-0" />}
                <span className="truncate">{item.label}</span>
              </Link>
            </React.Fragment>
          );
        })}
      </nav>
    </div>
  );
};
