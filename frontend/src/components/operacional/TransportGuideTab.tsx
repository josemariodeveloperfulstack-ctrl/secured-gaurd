import React from 'react';
import TransportGuideForm from './TransportGuideForm';

const TransportGuideTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Emissão de Guia de Transporte</h2>
          <p className="text-muted-foreground">
            Preencha o formulário para emitir uma guia de transporte de armas e munições
          </p>
        </div>
      </div>
      
      <TransportGuideForm />
    </div>
  );
};

export default TransportGuideTab;