import React, { useState, useEffect, useMemo } from 'react';
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
import ModelosDocumentosForm from './ModelosDocumentosForm';
import TermoResponsabilidadeEspecificoForm from './TermoResponsabilidadeEspecificoForm';
import TermoResponsabilidadeDanosMultasForm from './TermoResponsabilidadeDanosMultasForm';
import TermoBodyCamForm from './TermoBodyCamForm';
import NppsForm from './NppsForm';
import FichaEntregaEPIManualForm from './FichaEntregaEPIManualForm';
import RelatorioMovimentacaoForm from './RelatorioMovimentacaoForm';
import ValeSafetyTermsForm from './ValeSafetyTermsForm';
import { FileText, Shield, FileSignature, FileCheck, UserX, File, CreditCard, ArrowRightLeft, Car, Video } from 'lucide-react';
import type { Company } from '@/types/company';
import { companyService } from '@/services/companyService';
import { isVigilanciaCompany } from '@/utils/formatEmployeeAddress';

const VIG_ONLY_KEYS = new Set(['lgpd-vig', 'regras-ouro-vale', 'autorizacao-toxicologico']);

const tipos = [
  { key: 'modelos', label: 'Modelos de Documentos', icon: FileText, shortLabel: 'Modelos' },
  { key: 'vt', label: 'Termo de Compromisso de Vale-Transporte', icon: FileText, shortLabel: 'Vale-Transporte' },
  { key: 'epi', label: 'Ficha de Entrega de EPI', icon: Shield, shortLabel: 'EPI' },
  { key: 'epi-manual', label: 'Entrega de EPI Manual', icon: Shield, shortLabel: 'EPI Manual' },
  { key: 'termo-responsabilidade-especifico', label: 'Termo de Responsabilidade (VT)', icon: CreditCard, shortLabel: 'VT específico' },
  { key: 'equipamento', label: 'Termo de Responsabilidade de Equipamento', icon: Shield, shortLabel: 'Equipamento' },
  { key: 'danos-multas', label: 'Termo de Responsabilidade por Danos e Multas', icon: Car, shortLabel: 'Danos/Multas' },
  { key: 'body-cam', label: 'Termo de Responsabilidade e Uso de Câmera Corporal – Body Cam', icon: Video, shortLabel: 'Body Cam' },
  { key: 'lgpd-vig', label: 'Termo de Proteção de Dados – LGPD (VIG)', icon: FileCheck, shortLabel: 'LGPD VIG' },
  { key: 'regras-ouro-vale', label: 'Regras de Ouro da Vale', icon: Shield, shortLabel: 'Regras Ouro' },
  { key: 'autorizacao-toxicologico', label: 'Autorização para Teste Toxicológico', icon: FileCheck, shortLabel: 'Toxicológico' },
  { key: 'lgpd-consentimento', label: 'Termo de Consentimento LGPD', icon: Shield, shortLabel: 'LGPD' },
  { key: 'termo-ciencia', label: 'Termo de Ciência do Prestador de Serviços', icon: File, shortLabel: 'Termo Ciência' },
  { key: 'npps', label: 'NPPS – Norma e Procedimento do Posto', icon: FileText, shortLabel: 'NPPS' },
  { key: 'contratos', label: 'Contratos de Trabalho', icon: FileSignature, shortLabel: 'Contratos' },
  { key: 'ordens', label: 'Ordem de Serviços', icon: FileText, shortLabel: 'Ordens' },
  { key: 'advertencia', label: 'Advertência Disciplinar', icon: UserX, shortLabel: 'Advertência' },
  { key: 'declaracao', label: 'Declaração', icon: FileCheck, shortLabel: 'Declaração' },
  { key: 'movimentacao', label: 'Relatório de Movimentação do Funcionário', icon: ArrowRightLeft, shortLabel: 'Movimentação' },
];

interface DocumentosGerarTabProps {
  employeeId?: string;
  companyId?: string;
  companies?: Company[];
  employeeName?: string;
  hideHeader?: boolean;
  tipoSalarioContratual?: string;
  prazoExperienciaTexto?: string;
}

const DocumentosGerarTab: React.FC<DocumentosGerarTabProps> = ({
  employeeId: propEmployeeId,
  companyId: propCompanyId,
  companies: propCompanies,
  employeeName: propEmployeeName,
  hideHeader,
  tipoSalarioContratual,
  prazoExperienciaTexto
}) => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const tipoFromUrl = params.get('tipo');

  const [tipo, setTipo] = useState(tipoFromUrl || (hideHeader ? 'vt' : 'modelos'));
  const [isVigCompany, setIsVigCompany] = useState(false);

  const finalEmployeeId = propEmployeeId || params.get('employeeId') || undefined;
  const finalCompanyId = propCompanyId || params.get('companyId') || undefined;
  const sharedFormProps = {
    employeeId: finalEmployeeId,
    companyId: finalCompanyId,
    companies: propCompanies,
    employeeName: propEmployeeName,
  };

  useEffect(() => {
    let cancelled = false;
    const resolveVig = async () => {
      if (!finalCompanyId) {
        // Sem empresa fixa (tela geral de documentos): mostrar opções VIG.
        if (!cancelled) setIsVigCompany(true);
        return;
      }
      const fromProps = propCompanies?.find((c) => c.id === finalCompanyId);
      if (fromProps) {
        if (!cancelled) setIsVigCompany(isVigilanciaCompany(fromProps));
        return;
      }
      try {
        const company = await companyService.getCompanyById(finalCompanyId);
        if (!cancelled) setIsVigCompany(isVigilanciaCompany(company));
      } catch {
        if (!cancelled) setIsVigCompany(false);
      }
    };
    void resolveVig();
    return () => {
      cancelled = true;
    };
  }, [finalCompanyId, propCompanies]);

  const displayTipos = useMemo(() => {
    let list = hideHeader ? tipos.filter((t) => t.key !== 'modelos') : tipos;
    if (!isVigCompany) {
      list = list.filter((t) => !VIG_ONLY_KEYS.has(t.key));
    }
    return list;
  }, [hideHeader, isVigCompany]);

  // Atualizar tipo quando mudar na URL
  useEffect(() => {
    if (tipoFromUrl) {
      setTipo(tipoFromUrl);
    }
  }, [tipoFromUrl]);

  useEffect(() => {
    if (!displayTipos.some((t) => t.key === tipo)) {
      setTipo(displayTipos[0]?.key || (hideHeader ? 'vt' : 'modelos'));
    }
  }, [displayTipos, tipo, hideHeader]);

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
                type="button"
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
        {tipo === 'vt' && <TermoValeTransporteForm {...sharedFormProps} />}
        {tipo === 'epi' && <FichaEntregaEPIForm {...sharedFormProps} />}
        {tipo === 'epi-manual' && <FichaEntregaEPIManualForm {...sharedFormProps} />}
        {tipo === 'npps' && <NppsForm {...sharedFormProps} />}
        {tipo === 'termo-responsabilidade-especifico' && <TermoResponsabilidadeEspecificoForm {...sharedFormProps} />}
        {tipo === 'equipamento' && <TermoResponsabilidadeEquipamentoForm {...sharedFormProps} />}
        {tipo === 'danos-multas' && <TermoResponsabilidadeDanosMultasForm {...sharedFormProps} />}
        {tipo === 'body-cam' && <TermoBodyCamForm {...sharedFormProps} />}
        {tipo === 'lgpd-vig' && (
          <TermoLGPDForm {...sharedFormProps} termVariant="VIGILANCIA" />
        )}
        {tipo === 'regras-ouro-vale' && (
          <ValeSafetyTermsForm {...sharedFormProps} documentKind="golden-rules" />
        )}
        {tipo === 'autorizacao-toxicologico' && (
          <ValeSafetyTermsForm {...sharedFormProps} documentKind="toxicological" />
        )}
        {tipo === 'lgpd-consentimento' && (
          <TermoLGPDForm {...sharedFormProps} termVariant="DEFAULT" />
        )}
        {tipo === 'contratos' && (
          <ContratosTrabalhoForm
            {...sharedFormProps}
            tipoSalarioContratual={tipoSalarioContratual}
            prazoExperienciaTexto={prazoExperienciaTexto}
          />
        )}
        {tipo === 'ordens' && <OrdemServicosForm {...sharedFormProps} />}
        {tipo === 'advertencia' && <AdvertenciaDisciplinarForm {...sharedFormProps} />}
        {tipo === 'declaracao' && <DeclaracaoForm {...sharedFormProps} />}
        {tipo === 'termo-ciencia' && <TermoCienciaPrestadorForm {...sharedFormProps} />}
        {tipo === 'movimentacao' && <RelatorioMovimentacaoForm {...sharedFormProps} />}
      </div>
    </div>
  );
};

export default DocumentosGerarTab; 