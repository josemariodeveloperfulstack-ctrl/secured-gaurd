import React from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import TransportGuideForm from '@/components/operacional/TransportGuideForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

const GuiaTransporte: React.FC = () => {
  return (
    <StandardLayout>
      <div className="space-y-6">
        {/* Header da página */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-seguranca-darkred rounded-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-seguranca-lightgray">
              Guia de Transporte
            </h1>
            <p className="text-gray-400">
              Emissão de guia de transporte de armas e munições
            </p>
          </div>
        </div>

        {/* Formulário */}
        <Card className="bg-seguranca-graphite border-gray-600">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
              <FileText className="w-5 h-5 text-seguranca-yellow" />
              Emissão de Guia de Transporte
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <TransportGuideForm />
          </CardContent>
        </Card>
      </div>
    </StandardLayout>
  );
};

export default GuiaTransporte;
