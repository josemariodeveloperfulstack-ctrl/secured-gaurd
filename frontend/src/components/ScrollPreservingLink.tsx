import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useScrollPreservation } from '@/hooks/useScrollPreservation';

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
 * Útil para menus da sidebar que não devem alterar a posição de scroll
 */
export const ScrollPreservingLink: React.FC<ScrollPreservingLinkProps> = ({ 
  to, 
  className, 
  children, 
  onClick,
  preserveScroll = true, // Por padrão, preserva o scroll
  ...props 
}) => {
  const location = useLocation();
  const { preserveCurrentScroll, saveScrollPosition } = useScrollPreservation();

  const handleClick = (e: React.MouseEvent) => {
    // Se estamos navegando para a mesma página, não fazer nada
    if (location.pathname === to) {
      e.preventDefault();
      return;
    }

    // Se deve preservar scroll, salvar a posição atual
    if (preserveScroll) {
      // Salvar posição atual antes de navegar
      saveScrollPosition(location.pathname);
    }
    
    // Executar onClick personalizado se fornecido
    if (onClick) {
      onClick();
    }
  };

  return (
    <Link
      to={to}
      className={className}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Link>
  );
};
