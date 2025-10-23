import React from 'react';
import { Construction, GraduationCap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StandardLayout } from '@/components/StandardLayout';

const SSTTreinamentos: React.FC = () => {
  return (
    <StandardLayout title="Treinamentos SST" subtitle="Gestão de treinamentos de Saúde e Segurança do Trabalho">
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Construction className="h-5 w-5" />
            Módulo em Desenvolvimento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">
            O módulo de <strong>Treinamentos SST</strong> está em desenvolvimento e em breve estará disponível.
          </p>
          
          <div className="bg-white p-4 rounded-lg border border-orange-200">
            <h3 className="font-semibold text-gray-900 mb-3">Funcionalidades planejadas:</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>Gestão de treinamentos NR-35 (Trabalho em Altura)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>Treinamentos de CIPA</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>NR-10 (Segurança em Instalações e Serviços em Eletricidade)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>Brigada de Incêndio</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>Controle de certificados e vencimentos</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>Agendamento e presença em treinamentos</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>Relatórios de treinamentos realizados</span>
              </li>
            </ul>
          </div>

          <p className="text-sm text-gray-600 italic">
            Para solicitar priorização deste módulo ou sugerir funcionalidades, entre em contato com a equipe de desenvolvimento.
          </p>
        </CardContent>
      </Card>
    </StandardLayout>
  );
};

export default SSTTreinamentos;

