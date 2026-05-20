import React from 'react';
import { MainLayout } from './MainLayout';

interface StandardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  isSubPage?: boolean;
  noPadding?: boolean;
}

export const StandardLayout: React.FC<StandardLayoutProps> = ({ 
  children, 
  title,
  subtitle,
  isSubPage = false,
  noPadding = false
}) => {
  if (isSubPage) {
    return (
      <div className="space-y-6">
        {(title || subtitle) && (
          <div className="mb-6">
            {title && <h1 className="text-2xl font-black text-white uppercase tracking-tight">{title}</h1>}
            {subtitle && <p className="text-seguranca-lightgray text-sm">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    );
  }

  return (
    <MainLayout title={title} subtitle={subtitle} noPadding={noPadding}>
      {children}
    </MainLayout>
  );
}; 