import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useScrollPreservation } from '@/hooks/useScrollPreservation';
import { prefetchByPath } from '@/config/routePrefetch';

interface ScrollPreservingLinkProps {
  to: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  preserveScroll?: boolean; // Nova prop para controlar se deve preservar scroll
  [key: string]: any; // Para outras props do Link
}

/**
 * Componente de link que preserva a posição de scroll durante navegação
 * Útil para menus da sidebar que não devem alterar a posição de scroll.
 * 
 * Implementado com forwardRef para permitir que a sidebar consiga
 * fazer scroll automático até o item ativo usando scrollIntoView.
 */
export const ScrollPreservingLink = React.forwardRef<HTMLAnchorElement, ScrollPreservingLinkProps>(
  ({ 
    to, 
    className, 
    children, 
    onClick,
    preserveScroll = true, // Por padrão, preserva o scroll
    ...props 
  }, ref) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { saveScrollPosition } = useScrollPreservation();

    const normalizePath = (path: string) => {
      const base = path.split('?')[0];
      if (base.length > 1 && base.endsWith('/')) {
        return base.slice(0, -1);
      }
      return base || '/';
    };

    const handleMouseEnter = () => {
      prefetchByPath(to);
    };

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      const targetPath = normalizePath(to);
      const currentPath = normalizePath(location.pathname);
      const targetSearch = to.includes('?') ? to.slice(to.indexOf('?')) : '';
      const currentSearch = location.search || '';

      // Se for exatamente a mesma rota e exatamente a mesma query string, não precisa navegar
      if (currentPath === targetPath && currentSearch === targetSearch) {
        e.preventDefault();
        return;
      }

      if (preserveScroll) {
        saveScrollPosition(location.pathname);
      }

      if (onClick) {
        onClick(e);
      }

      // Garante navegação mesmo quando mudando query params na mesma rota (ex: /operacional?tab=...)
      e.preventDefault();
      navigate(to);
    };

    return (
      <Link
        ref={ref}
        to={to}
        className={className}
        onMouseEnter={handleMouseEnter}
        onClick={handleClick}
        {...props}
      >
        {children}
      </Link>
    );
  }
);

ScrollPreservingLink.displayName = 'ScrollPreservingLink';
