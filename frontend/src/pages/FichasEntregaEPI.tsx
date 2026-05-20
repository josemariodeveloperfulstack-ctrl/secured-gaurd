import React from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { FichasEntregaEPIContent } from '@/components/epi/FichasEntregaEPIContent';

const FichasEntregaEPI: React.FC = () => {
  return (
    <StandardLayout>
      <FichasEntregaEPIContent />
    </StandardLayout>
  );
};

export default FichasEntregaEPI;
