import React from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import CentroCustosTab from '@/components/financeiro/CentroCustosTab';

const CentrosDeCusto: React.FC = () => {
  return (
    <StandardLayout>
      <div className="container mx-auto p-6">
        <CentroCustosTab />
      </div>
    </StandardLayout>
  );
};

export default CentrosDeCusto;


