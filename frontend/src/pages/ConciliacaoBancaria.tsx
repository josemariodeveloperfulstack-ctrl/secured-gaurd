import React from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import ConciliacaoBancaria from '@/components/financeiro/ConciliacaoBancaria';

const ConciliacaoBancariaPage: React.FC = () => {
  return (
    <StandardLayout>
      <ConciliacaoBancaria />
    </StandardLayout>
  );
};

export default ConciliacaoBancariaPage;