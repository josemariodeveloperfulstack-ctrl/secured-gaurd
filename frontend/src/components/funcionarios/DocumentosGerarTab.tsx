import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import TermoValeTransporteForm from './TermoValeTransporteForm';
import FichaEntregaEPIForm from './FichaEntregaEPIForm';
import TermoResponsabilidadeEquipamentoForm from './TermoResponsabilidadeEquipamentoForm';
import TermoLGPDForm from './TermoLGPDForm';
import ContratosTrabalhoForm from './ContratosTrabalhoForm';
import OrdemServicosForm from './OrdemServicosForm';
import AdvertenciaDisciplinarForm from './AdvertenciaDisciplinarForm';
import DeclaracaoForm from './DeclaracaoForm';
import TermoCienciaPrestadorForm from './TermoCienciaPrestadorForm';
import OrdemServicoForm from './OrdemServicoForm';
import ModelosDocumentosForm from './ModelosDocumentosForm';
import TermoResponsabilidadeEspecíficoForm from './TermoResponsabilidadeEspecíficoForm';
import NppsForm from './NppsForm';
import FichaEntregaEPIManualForm from './FichaEntregaEPIManualForm';
import { FileText, Shield, FileSignature, FileCheck, UserX, File, CreditCard } from 'lucide-react';

const tipos = [
  { key: 'modelos', label: 'Modelos de Documentos', icon: FileText, shortLabel: 'Modelos' },
  { key: 'vt', label: 'Termo de Compromisso de Vale-Transporte', icon: FileText, shortLabel: 'Vale-Transporte' },
  { key: 'epi', label: 'Ficha de Entrega de EPI', icon: Shield, shortLabel: 'EPI' },
  { key: 'epi-manual', label: 'Entrega de EPI Manual', icon: Shield, shortLabel: 'EPI Manual' },
  { key: 'termo-responsabilidade-especifico', label: 'Termo de Responsabilidade (VT/Celular)', icon: CreditCard, shortLabel: 'Vale/Celular' },
  { key: 'equipamento', label: 'Termo de Responsabilidade de Equipamento', icon: Shield, shortLabel: 'Equipamento' },
  { key: 'lgpd', label: 'Termo de Consentimento LGPD', icon: FileCheck, shortLabel: 'LGPD' },
  { key: 'npps', label: 'NPPS – Norma e Procedimento do Posto', icon: FileText, shortLabel: 'NPPS' },
  { key: 'contratos', label: 'Contratos de Trabalho', icon: FileSignature, shortLabel: 'Contratos' },
  { key: 'ordens', label: 'Ordem de Serviços', icon: FileText, shortLabel: 'Ordens' },
  { key: 'advertencia', label: 'Advertência Disciplinar', icon: UserX, shortLabel: 'Advertência' },
  { key: 'declaracao', label: 'Declaração', icon: FileCheck, shortLabel: 'Declaração' },
  { key: 'termo-ciencia', label: 'Termo de Ciência do Prestador de Serviços', icon: File, shortLabel: 'Termo Ciência' },
];

interface DocumentosGerarTabProps {
  employeeId?: string;
  companyId?: string;
  hideHeader?: boolean;
}

const DocumentosGerarTab: React.FC<DocumentosGerarTabProps> = ({ employeeId: propEmployeeId, companyId: propCompanyId, hideHeader }) => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const tipoFromUrl = params.get('tipo');

  const displayTipos = hideHeader ? tipos.filter(t => t.key !== 'modelos') : tipos;
  const defaultTipo = tipoFromUrl || (hideHeader ? 'vt' : 'modelos');

  const [tipo, setTipo] = useState(defaultTipo);

  const finalEmployeeId = propEmployeeId || params.get('employeeId') || undefined;
  const finalCompanyId = propCompanyId || params.get('companyId') || undefined;

  // Atualizar tipo quando mudar na URL
  useEffect(() => {
    if (tipoFromUrl) {
      setTipo(tipoFromUrl);
    }
  }, [tipoFromUrl]);

  return (
    <div className="space-y-6">
      {/* Header com título */}
      {!hideHeader && (
        <div>
          <h2 className="text-2xl font-bold text-seguranca-lightgray flex items-center gap-2">
            <FileText className="h-6 w-6 text-seguranca-red" />
            <span>Gerar Documentos</span>
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Selecione o tipo de documento que deseja gerar
          </p>
        </div>
      )}

      {/* Botões de seleção de tipo */}
      <div className="w-full">
        <div className="flex flex-wrap gap-2 md:gap-3">
          {displayTipos.map(t => {
            const Icon = t.icon;
            const isActive = tipo === t.key;
            return (
              <Button
                key={t.key}
                variant={isActive ? 'default' : 'outline'}
                onClick={() => setTipo(t.key)}
                className={`
                  flex items-center gap-2 
                  text-sm 
                  px-4 md:px-5 
                  py-2.5 
                  h-10 
                  whitespace-nowrap
                  transition-all duration-200
                  ${isActive
                    ? 'bg-seguranca-red hover:bg-seguranca-red/90 text-white border-seguranca-red shadow-lg shadow-seguranca-red/20'
                    : 'bg-seguranca-black border-gray-600 text-gray-400 hover:text-seguranca-lightgray hover:border-gray-500'
                  }
                  flex-shrink-0
                `}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.shortLabel}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo do formulário selecionado */}
      <div>
        {tipo === 'modelos' && <ModelosDocumentosForm hideHeaderStats={hideHeader} />}
        {tipo === 'vt' && <TermoValeTransporteForm employeeId={finalEmployeeId} companyId={finalCompanyId} />}
        {tipo === 'epi' && <FichaEntregaEPIForm employeeId={finalEmployeeId} companyId={finalCompanyId} />}
        {tipo === 'epi-manual' && <FichaEntregaEPIManualForm companyId={finalCompanyId} employeeId={finalEmployeeId} />}
        {tipo === 'npps' && <NppsForm />}
        {tipo === 'termo-responsabilidade-especifico' && <TermoResponsabilidadeEspecíficoForm employeeId={finalEmployeeId} companyId={finalCompanyId} />}
        {tipo === 'equipamento' && <TermoResponsabilidadeEquipamentoForm employeeId={finalEmployeeId} companyId={finalCompanyId} />}
        {tipo === 'lgpd' && <TermoLGPDForm employeeId={finalEmployeeId} companyId={finalCompanyId} />}
        {tipo === 'contratos' && <ContratosTrabalhoForm employeeId={finalEmployeeId} companyId={finalCompanyId} />}
        {tipo === 'ordens' && <OrdemServicosForm employeeId={finalEmployeeId} companyId={finalCompanyId} />}
        {tipo === 'advertencia' && <AdvertenciaDisciplinarForm employeeId={finalEmployeeId} companyId={finalCompanyId} />}
        {tipo === 'declaracao' && <DeclaracaoForm employeeId={finalEmployeeId} companyId={finalCompanyId} />}
        {tipo === 'termo-ciencia' && <TermoCienciaPrestadorForm employeeId={finalEmployeeId} companyId={finalCompanyId} />}
      </div>
    </div>
  );
};

export default DocumentosGerarTab; 