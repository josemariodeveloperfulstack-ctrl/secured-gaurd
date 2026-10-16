import React from 'react';
import { MainLayout } from './MainLayout';

interface StandardLayoutProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: string;
  headerActions?: React.ReactNode;
  isSubPage?: boolean;
  noPadding?: boolean;
}

export const StandardLayout: React.FC<StandardLayoutProps> = ({ 
  children, 
  title,
  subtitle,
  headerActions,
  isSubPage = false,
  noPadding = false
}) => {
  if (isSubPage) {
    return (
      <div className="space-y-6">
        {(title || subtitle || headerActions) && (
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              {title && <h1 className="text-2xl font-black text-white uppercase tracking-tight">{title}</h1>}
              {subtitle && <p className="text-seguranca-lightgray text-sm">{subtitle}</p>}
            </div>
            {headerActions && (
              <div className="flex items-center flex-wrap gap-2 shrink-0">
                {headerActions}
              </div>
            )}
          </div>
        )}
        {children}
      </div>
    );
  }

  return (
    <MainLayout title={title} subtitle={subtitle} headerActions={headerActions} noPadding={noPadding}>
      {children}
    </MainLayout>
  );
}; 