import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import leadService, { Lead } from '@/services/leadService';
import prospectionService, { ProspectCompany } from '@/services/prospectionService';
import LeadHistory from '@/components/comercial/LeadHistory';
import {
  Building2,
  User,
  Mail,
  Phone,
  PhoneCall,
  MessageSquare,
  Calendar,
  DollarSign,
  Clock,
  Edit,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Briefcase,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Share2,
  FileText,
  RefreshCw,
  Globe,
  Sparkles,
  Users,
  Search,
  Loader2,
  ArrowUpRight
} from 'lucide-react';

interface LeadViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onEdit: (lead: Lead) => void;
  onDelete?: (leadId: string | number) => void;
}

interface ParsedProspectionData {
  isProspection: boolean;
  cnpj?: string;
  nomeFantasia?: string;
  cnaeCodigo?: string;
  cnaeDescricao?: string;
  porte?: string;
  situacaoCadastral?: string;
  enderecoCompleto?: string;
  qsa: { nome: string; qualificacao: string }[];
  observacoesAdicionais?: string;
}

export const formatSafeDate = (dateString?: string | null): string => {
  if (!dateString || typeof dateString !== 'string' || dateString.trim() === '') return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-BR');
  } catch {
    return '-';
  }
};

export const formatSafeDateTime = (dateString?: string | null): string => {
  if (!dateString || typeof dateString !== 'string' || dateString.trim() === '') return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
};

export const formatCurrencyBRL = (value?: number | null): string => {
  if (value === undefined || value === null || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const parseLeadNotes = (notesText?: string): ParsedProspectionData => {
  const result: ParsedProspectionData = {
    isProspection: false,
    qsa: [],
  };

  if (!notesText || typeof notesText !== 'string') {
    return result;
  }

  if (notesText.includes('[PROSPECÇÃO ATIVA IA]')) {
    result.isProspection = true;
  }

  // CNPJ
  const cnpjMatch = notesText.match(/CNPJ:\s*([\d\.\/\-]+)/i);
  if (cnpjMatch && cnpjMatch[1]) {
    result.cnpj = cnpjMatch[1].trim();
  }

  // Nome Fantasia
  const fantasiaMatch = notesText.match(/Nome Fantasia:\s*([^\n\rCNAE\-]+)/i);
  if (fantasiaMatch && fantasiaMatch[1] && fantasiaMatch[1].trim() !== '-') {
    result.nomeFantasia = fantasiaMatch[1].trim();
  }

  // CNAE
  const cnaeMatch = notesText.match(/CNAE:\s*([^\n\rPorte]+)/i);
  if (cnaeMatch && cnaeMatch[1]) {
    const fullCnae = cnaeMatch[1].trim();
    const parts = fullCnae.split(' - ');
    if (parts.length > 1) {
      result.cnaeCodigo = parts[0].trim();
      result.cnaeDescricao = parts.slice(1).join(' - ').trim();
    } else {
      result.cnaeDescricao = fullCnae;
    }
  }

  // Porte
  const porteMatch = notesText.match(/Porte:\s*([^\n\rSituação]+)/i);
  if (porteMatch && porteMatch[1]) {
    result.porte = porteMatch[1].trim();
  }

  // Situação Cadastral
  const situacaoMatch = notesText.match(/Situação:\s*([^\n\rEndereço]+)/i);
  if (situacaoMatch && situacaoMatch[1]) {
    result.situacaoCadastral = situacaoMatch[1].trim();
  }

  // Endereço
  const enderecoMatch = notesText.match(/Endereço:\s*([^\n\rQuadro]+)/i);
  if (enderecoMatch && enderecoMatch[1]) {
    result.enderecoCompleto = enderecoMatch[1].trim();
  }

  // QSA (Sócios e Diretores)
  const qsaIndex = notesText.indexOf('Quadro Societário (QSA):');
  if (qsaIndex !== -1) {
    const qsaBlock = notesText.substring(qsaIndex + 'Quadro Societário (QSA):'.length);
    const socioLines = qsaBlock.split(/[\n\r]+/);
    for (const line of socioLines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('-')) {
        const itemContent = trimmed.substring(1).trim();
        const parenMatch = itemContent.match(/^(.+?)\s*\((.+?)\)$/);
        if (parenMatch) {
          result.qsa.push({
            nome: parenMatch[1].trim(),
            qualificacao: parenMatch[2].trim(),
          });
        } else if (itemContent) {
          result.qsa.push({
            nome: itemContent,
            qualificacao: 'Sócio / Diretor',
          });
        }
      }
    }
  }

  // Observações manuais adicionais (remover o cabeçalho gerado)
  if (!result.isProspection) {
    result.observacoesAdicionais = notesText;
  }

  return result;
};

export const LeadViewModal: React.FC<LeadViewModalProps> = ({
  isOpen,
  onClose,
  lead: initialLead,
  onEdit,
  onDelete,
}) => {
  const { toast } = useToast();
  const [currentLead, setCurrentLead] = useState<Lead | null>(initialLead);
  const [loadingFresh, setLoadingFresh] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Consulta ao vivo Receita Federal
  const [consultingReceita, setConsultingReceita] = useState(false);
  const [receitaData, setReceitaData] = useState<ProspectCompany | null>(null);

  // Filtro de sócios QSA
  const [qsaFilter, setQsaFilter] = useState('');

  // Sincronizar lead quando modal abre e carregar do backend
  useEffect(() => {
    if (initialLead && isOpen) {
      setCurrentLead(initialLead);
      setReceitaData(null);
      setQsaFilter('');

      // Buscar dados 100% atualizados no backend
      const fetchFreshLead = async () => {
        try {
          setLoadingFresh(true);
          const fresh = await leadService.getLeadById(String(initialLead.id));
          if (fresh && fresh.id) {
            setCurrentLead({
              ...fresh,
              notes: fresh.notes || (fresh as any).description || initialLead.notes || initialLead.description,
            });
          }
        } catch (err) {
          console.warn('Não foi possível atualizar dados em segundo plano:', err);
        } finally {
          setLoadingFresh(false);
        }
      };

      fetchFreshLead();
    }
  }, [initialLead, isOpen]);

  if (!currentLead) return null;

  const parsed = parseLeadNotes(currentLead.notes || currentLead.description);

  // Copiar texto para o clipboard
  const handleCopy = (text: string, label: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast({
      title: `${label} copiado!`,
      description: text,
    });
  };

  // Abrir WhatsApp com mensagem comercial elegante
  const handleOpenWhatsApp = () => {
    const rawNumber = currentLead.mobile || currentLead.phone;
    if (!rawNumber) {
      toast({
        title: 'Sem número de telefone',
        description: 'Este lead não possui telefone ou celular cadastrado.',
        variant: 'destructive',
      });
      return;
    }

    const clean = rawNumber.replace(/\D/g, '');
    const phone = clean.startsWith('55') ? clean : `55${clean}`;
    const saudacao = currentLead.name ? `Olá, ${currentLead.name}!` : 'Olá!';
    const empresaRef = currentLead.company ? ` na ${currentLead.company}` : '';
    const msg = encodeURIComponent(
      `${saudacao} Tudo bem?\n\nMe chamo especialista de soluções corporativas da Secured Guard. Gostaria de entender mais sobre as operações e necessidades${empresaRef} para apresentar nossos serviços integrados em segurança, facilities e tecnologia.\n\nVocê teria 5 minutos para uma breve conversa nesta semana?`
    );

    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  // Consulta ao vivo na Receita Federal se tiver CNPJ
  const handleLookupReceita = async () => {
    const targetCnpj = parsed.cnpj;
    if (!targetCnpj) {
      toast({
        title: 'CNPJ não identificado',
        description: 'Não foi possível encontrar o número de CNPJ deste lead.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setConsultingReceita(true);
      const companyData = await prospectionService.searchByCnpj(targetCnpj);
      setReceitaData(companyData);
      toast({
        title: 'Dados oficiais sincronizados!',
        description: `${companyData.razaoSocial} consultada com sucesso na base oficial.`,
      });
    } catch (err: any) {
      toast({
        title: 'Consulta à Receita',
        description: err.message || 'Não foi possível consultar os dados oficiais no momento.',
        variant: 'destructive',
      });
    } finally {
      setConsultingReceita(false);
    }
  };

  // Copiar resumo completo do lead
  const handleCopyLeadSummary = () => {
    const lines = [
      `📋 FICHA DO LEAD - SECURED GUARD`,
      `Nome: ${currentLead.name}`,
      `Cargo: ${currentLead.position || '-'}`,
      `Empresa: ${currentLead.company || '-'}`,
      parsed.cnpj ? `CNPJ: ${parsed.cnpj}` : null,
      currentLead.phone ? `Telefone: ${currentLead.phone}` : null,
      currentLead.mobile ? `Celular/WhatsApp: ${currentLead.mobile}` : null,
      currentLead.email ? `E-mail: ${currentLead.email}` : null,
      `Status: ${currentLead.status}`,
      `Fonte: ${currentLead.source}`,
      `Valor Estimado: ${formatCurrencyBRL(currentLead.estimatedValue)}`,
      parsed.enderecoCompleto ? `Endereço: ${parsed.enderecoCompleto}` : null,
      parsed.qsa.length > 0
        ? `Quadro Societário (QSA):\n${parsed.qsa.map((s) => `• ${s.nome} (${s.qualificacao})`).join('\n')}`
        : null,
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join('\n'));
    toast({
      title: 'Ficha copiada!',
      description: 'Todos os dados do lead foram copiados para a área de transferência.',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      NEW: { label: 'Novo', className: 'bg-blue-950 text-blue-300 border-blue-700/60' },
      CONTACTED: { label: 'Contactado', className: 'bg-amber-950 text-amber-300 border-amber-700/60' },
      QUALIFIED: { label: 'Qualificado', className: 'bg-emerald-950 text-emerald-300 border-emerald-700/60' },
      PROPOSAL_SENT: { label: 'Proposta Enviada', className: 'bg-indigo-950 text-indigo-300 border-indigo-700/60' },
      NEGOTIATION: { label: 'Em Negociação', className: 'bg-orange-950 text-orange-300 border-orange-700/60' },
      WON: { label: 'Ganho / Fechado', className: 'bg-emerald-600 text-white font-bold' },
      LOST: { label: 'Perdido', className: 'bg-red-950 text-red-300 border-red-700/60' },
      INACTIVE: { label: 'Inativo', className: 'bg-gray-800 text-gray-300 border-gray-700' },
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-800 text-gray-300 border-gray-700' };
    return (
      <Badge variant="outline" className={`${config.className} px-2.5 py-0.5 text-xs font-semibold`}>
        {config.label}
      </Badge>
    );
  };

  const getSourceBadge = (source: string) => {
    const sourceConfig: Record<string, { label: string; className: string }> = {
      WEBSITE: { label: 'Website', className: 'bg-blue-900/30 text-blue-300 border-blue-800' },
      REFERRAL: { label: 'Indicação', className: 'bg-emerald-900/30 text-emerald-300 border-emerald-800' },
      COLD_CALL: { label: 'Ligação Ativa', className: 'bg-amber-900/30 text-amber-300 border-amber-800' },
      EMAIL_MARKETING: { label: 'Email Marketing', className: 'bg-sky-900/30 text-sky-300 border-sky-800' },
      SOCIAL_MEDIA: { label: 'Redes Sociais', className: 'bg-pink-900/30 text-pink-300 border-pink-800' },
      GOOGLE_ADS: { label: 'Google Ads', className: 'bg-red-900/30 text-red-300 border-red-800' },
      EVENT: { label: 'Evento', className: 'bg-teal-900/30 text-teal-300 border-teal-800' },
      PARTNER: { label: 'Parceiro', className: 'bg-cyan-900/30 text-cyan-300 border-cyan-800' },
      OTHER: { label: 'Outro / Prospecção IA', className: 'bg-amber-950/40 text-seguranca-yellow border-amber-700/50' },
    };

    const config = sourceConfig[source] || { label: source, className: 'bg-gray-800 text-gray-400 border-gray-700' };
    return (
      <Badge variant="outline" className={`${config.className} px-2 py-0.5 text-[11px]`}>
        {config.label}
      </Badge>
    );
  };

  const filteredQsa = parsed.qsa.filter((s) => {
    if (!qsaFilter.trim()) return true;
    const term = qsaFilter.toLowerCase();
    return s.nome.toLowerCase().includes(term) || s.qualificacao.toLowerCase().includes(term);
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[96vw] max-h-[92vh] overflow-y-auto p-0 bg-[#0B0F19] border border-gray-800 text-gray-200 shadow-2xl rounded-xl">
        {/* CABEÇALHO EXECUTIVO PREMIUM */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#111827] via-[#1E293B] to-[#0F172A] p-4 sm:p-6 border-b border-gray-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              {/* Avatar da Empresa / Lead */}
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-red-600/30 border border-amber-500/30 flex items-center justify-center text-seguranca-yellow font-bold text-lg sm:text-xl shrink-0 shadow-inner">
                {currentLead.company ? currentLead.company.substring(0, 2).toUpperCase() : <User className="h-6 w-6" />}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight leading-snug">
                    {currentLead.name || 'Lead sem Nome'}
                  </h2>
                  {loadingFresh && (
                    <span className="flex items-center text-[10px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                      <Loader2 className="h-2.5 w-2.5 animate-spin mr-1" />
                      Atualizando...
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-300">
                  {currentLead.position && (
                    <span className="font-semibold text-seguranca-yellow flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5" />
                      {currentLead.position}
                    </span>
                  )}
                  {currentLead.position && currentLead.company && <span>•</span>}
                  {currentLead.company && (
                    <span className="text-gray-200 font-medium flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-gray-400" />
                      {currentLead.company}
                    </span>
                  )}
                </div>

                {/* Badges de Status & Origem */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {getStatusBadge(currentLead.status)}
                  {getSourceBadge(currentLead.source)}
                  {parsed.cnpj && (
                    <Badge className="bg-seguranca-black text-seguranca-yellow border border-seguranca-yellow/40 text-[10px] font-mono flex items-center gap-1">
                      CNPJ: {parsed.cnpj}
                    </Badge>
                  )}
                  {parsed.situacaoCadastral && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${
                        parsed.situacaoCadastral === 'ATIVA'
                          ? 'border-emerald-500/50 text-emerald-400 bg-emerald-950/30'
                          : 'border-amber-500/50 text-amber-400 bg-amber-950/30'
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current mr-1 animate-pulse" />
                      {parsed.situacaoCadastral}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO RÁPIDA (DESKTOP E MOBILE) */}
            <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
              {(currentLead.mobile || currentLead.phone) && (
                <Button
                  size="sm"
                  onClick={handleOpenWhatsApp}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-3.5 shadow-md flex items-center gap-1.5"
                  title="Abrir WhatsApp com mensagem personalizada"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>WhatsApp</span>
                </Button>
              )}

              {(currentLead.phone || currentLead.mobile) && (
                <a
                  href={`tel:${(currentLead.phone || currentLead.mobile || '').replace(/\D/g, '')}`}
                  className="inline-flex items-center justify-center rounded-md font-medium text-xs h-9 px-3 border border-gray-700 bg-seguranca-black hover:bg-gray-800 text-gray-200 transition-colors gap-1.5"
                  title="Ligar para o telefone cadastrado"
                >
                  <PhoneCall className="h-3.5 w-3.5 text-seguranca-yellow" />
                  <span>Ligar</span>
                </a>
              )}

              {currentLead.email && (
                <a
                  href={`mailto:${currentLead.email}`}
                  className="inline-flex items-center justify-center rounded-md font-medium text-xs h-9 px-3 border border-gray-700 bg-seguranca-black hover:bg-gray-800 text-gray-200 transition-colors gap-1.5"
                  title="Enviar e-mail para este contato"
                >
                  <Mail className="h-3.5 w-3.5 text-seguranca-yellow" />
                  <span>E-mail</span>
                </a>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLeadSummary}
                className="border-gray-700 bg-seguranca-black hover:bg-gray-800 text-gray-300 text-xs h-9 px-2.5"
                title="Copiar resumo comercial do lead"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>

              <Button
                size="sm"
                onClick={() => onEdit(currentLead)}
                className="bg-seguranca-yellow hover:bg-yellow-500 text-black font-bold text-xs h-9 px-3.5 shadow"
              >
                <Edit className="h-3.5 w-3.5 mr-1.5" />
                Editar
              </Button>
            </div>
          </div>
        </div>

        {/* CORPO PRINCIPAL COM CONTEÚDO ESTRUTURADO */}
        <div className="p-4 sm:p-6 space-y-5">
          {/* FAIXA DE MÉTRICAS RÁPIDAS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#121826] border border-gray-800/80 rounded-lg p-3">
              <span className="text-[11px] font-medium text-gray-400 block mb-1 flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                Valor Estimado
              </span>
              <p className="text-base sm:text-lg font-bold text-emerald-400">
                {formatCurrencyBRL(currentLead.estimatedValue)}
              </p>
            </div>

            <div className="bg-[#121826] border border-gray-800/80 rounded-lg p-3">
              <span className="text-[11px] font-medium text-gray-400 block mb-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-seguranca-yellow" />
                Próximo Follow-up
              </span>
              <p className="text-xs sm:text-sm font-semibold text-white">
                {formatSafeDateTime(currentLead.nextFollowUp)}
              </p>
            </div>

            <div className="bg-[#121826] border border-gray-800/80 rounded-lg p-3">
              <span className="text-[11px] font-medium text-gray-400 block mb-1 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                Criado em
              </span>
              <p className="text-xs sm:text-sm font-semibold text-white">
                {formatSafeDate(currentLead.createdAt)}
              </p>
            </div>

            <div className="bg-[#121826] border border-gray-800/80 rounded-lg p-3">
              <span className="text-[11px] font-medium text-gray-400 block mb-1 flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-blue-400" />
                Responsável
              </span>
              <p className="text-xs sm:text-sm font-semibold text-white truncate" title={currentLead.assignedToName || 'Não atribuído'}>
                {currentLead.assignedToName || (currentLead.assignedTo && currentLead.assignedTo.name) || 'Geral / Não atribuído'}
              </p>
            </div>
          </div>

          {/* GRID PRINCIPAL: 2 COLUNAS RESPONSIVAS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* COLUNA ESQUERDA (7 COLUNAS): DADOS DA EMPRESA, CNPJ E SÓCIOS */}
            <div className="lg:col-span-7 space-y-5">
              {/* CARD: DADOS DA EMPRESA & RECEITA FEDERAL */}
              <div className="bg-[#121826] border border-gray-800 rounded-xl p-4 sm:p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-seguranca-yellow" />
                    Inteligência Cadastral & Empresa
                  </h3>

                  {parsed.cnpj && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLookupReceita}
                      disabled={consultingReceita}
                      className="text-xs text-amber-400 hover:text-amber-300 h-7 px-2 hover:bg-amber-500/10"
                      title="Consultar dados em tempo real na Receita Federal"
                    >
                      {consultingReceita ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          Consultando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Checar Receita
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-400 block text-[11px] font-medium">Razão Social / Nome da Empresa</span>
                    <span className="text-white font-semibold block mt-0.5">
                      {currentLead.company || '-'}
                    </span>
                  </div>

                  {parsed.nomeFantasia && (
                    <div>
                      <span className="text-gray-400 block text-[11px] font-medium">Nome Fantasia</span>
                      <span className="text-white font-semibold block mt-0.5">
                        {parsed.nomeFantasia}
                      </span>
                    </div>
                  )}

                  {parsed.cnpj && (
                    <div>
                      <span className="text-gray-400 block text-[11px] font-medium">CNPJ Oficial</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-seguranca-yellow font-bold">{parsed.cnpj}</span>
                        <button
                          onClick={() => handleCopy(parsed.cnpj!, 'CNPJ', 'cnpj')}
                          className="text-gray-400 hover:text-white p-0.5"
                          title="Copiar CNPJ"
                        >
                          {copiedKey === 'cnpj' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {parsed.porte && (
                    <div>
                      <span className="text-gray-400 block text-[11px] font-medium">Porte da Empresa</span>
                      <span className="text-white font-medium block mt-0.5">{parsed.porte}</span>
                    </div>
                  )}

                  {parsed.cnaeDescricao && (
                    <div className="sm:col-span-2 bg-[#0B0F19] p-3 rounded-lg border border-gray-800">
                      <span className="text-gray-400 block text-[11px] font-medium">Atividade Econômica Principal (CNAE)</span>
                      <p className="text-white font-medium text-xs mt-1 leading-relaxed">
                        {parsed.cnaeCodigo ? <strong className="text-seguranca-yellow">{parsed.cnaeCodigo} - </strong> : null}
                        {parsed.cnaeDescricao}
                      </p>
                    </div>
                  )}

                  {parsed.enderecoCompleto && (
                    <div className="sm:col-span-2 bg-[#0B0F19] p-3 rounded-lg border border-gray-800">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-gray-400 block text-[11px] font-medium flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-seguranca-yellow" />
                            Endereço Cadastrado
                          </span>
                          <p className="text-white text-xs mt-1 leading-relaxed">{parsed.enderecoCompleto}</p>
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            `${currentLead.company || ''} ${parsed.enderecoCompleto}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-950/40 px-2.5 py-1 rounded border border-blue-900/50 mt-1"
                        >
                          <span>Maps</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Exibição de dados frescos consultados da Receita WS / BrasilAPI */}
                {receitaData && (
                  <div className="mt-3 p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-lg space-y-2">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Dados Oficiais Atualizados da Receita Federal:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-400">Natureza Jurídica:</span>{' '}
                        <span className="text-white font-medium">{receitaData.naturezaJuridica || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Capital Social:</span>{' '}
                        <span className="text-white font-medium">{formatCurrencyBRL(receitaData.capitalSocial)}</span>
                      </div>
                      {receitaData.dataInicioAtividade && (
                        <div>
                          <span className="text-gray-400">Abertura:</span>{' '}
                          <span className="text-white font-medium">{formatSafeDate(receitaData.dataInicioAtividade)}</span>
                        </div>
                      )}
                      {receitaData.email && (
                        <div>
                          <span className="text-gray-400">E-mail Cadastrado:</span>{' '}
                          <span className="text-emerald-300 font-mono">{receitaData.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* CARD: QUADRO SOCIETÁRIO (QSA) & DIRETORES */}
              {parsed.qsa.length > 0 && (
                <div className="bg-[#121826] border border-gray-800 rounded-xl p-4 sm:p-5 space-y-3.5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-cyan-400" />
                      <h3 className="text-sm font-bold text-white">Quadro Societário & Administradores (QSA)</h3>
                      <Badge className="bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-semibold">
                        {parsed.qsa.length}
                      </Badge>
                    </div>

                    {parsed.qsa.length > 3 && (
                      <div className="relative">
                        <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Filtrar sócio ou cargo..."
                          value={qsaFilter}
                          onChange={(e) => setQsaFilter(e.target.value)}
                          className="bg-[#0B0F19] border border-gray-700 text-xs rounded-lg pl-8 pr-2.5 py-1 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 w-full sm:w-48"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                    {filteredQsa.map((socio, idx) => {
                      const isMainContact =
                        currentLead.name &&
                        socio.nome.toLowerCase().includes(currentLead.name.toLowerCase());

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-2 transition-colors ${
                            isMainContact
                              ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                              : 'bg-[#0B0F19] border-gray-800 hover:border-gray-700 text-gray-300'
                          }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-white truncate block">{socio.nome}</span>
                              {isMainContact && (
                                <Badge className="bg-amber-500 text-black font-bold text-[9px] px-1 py-0 h-4">
                                  Lead Principal
                                </Badge>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-400 block">{socio.qualificacao}</span>
                          </div>

                          <button
                            onClick={() => handleCopy(socio.nome, 'Nome do sócio', `socio-${idx}`)}
                            className="text-gray-500 hover:text-white p-1 shrink-0"
                            title="Copiar nome do sócio"
                          >
                            {copiedKey === `socio-${idx}` ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CARD: OBSERVAÇÕES ADICIONAIS */}
              {parsed.observacoesAdicionais && (
                <div className="bg-[#121826] border border-gray-800 rounded-xl p-4 sm:p-5 space-y-2 shadow-sm">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-gray-800/80 pb-2.5">
                    <FileText className="h-4 w-4 text-seguranca-yellow" />
                    Observações & Anotações
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-300 whitespace-pre-wrap leading-relaxed pt-1">
                    {parsed.observacoesAdicionais}
                  </p>
                </div>
              )}
            </div>

            {/* COLUNA DIREITA (5 COLUNAS): CONTATOS REAIS & HISTÓRICO */}
            <div className="lg:col-span-5 space-y-5">
              {/* CARD: CANAIS DE CONTATO DIRETOS */}
              <div className="bg-[#121826] border border-gray-800 rounded-xl p-4 sm:p-5 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-gray-800/80 pb-3">
                  <Phone className="h-4 w-4 text-emerald-400" />
                  Canais de Contato & Decisor
                </h3>

                <div className="space-y-3 text-xs sm:text-sm">
                  {/* Telefone Fixo */}
                  <div className="p-3 bg-[#0B0F19] rounded-lg border border-gray-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[11px] text-gray-400 block font-medium">Telefone Principal</span>
                      {currentLead.phone ? (
                        <a
                          href={`tel:${currentLead.phone.replace(/\D/g, '')}`}
                          className="text-white font-mono font-semibold hover:text-seguranca-yellow transition-colors block truncate"
                        >
                          {currentLead.phone}
                        </a>
                      ) : (
                        <span className="text-gray-500 italic block">Não informado</span>
                      )}
                    </div>
                    {currentLead.phone && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleCopy(currentLead.phone, 'Telefone', 'phone')}
                          className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-800"
                          title="Copiar telefone"
                        >
                          {copiedKey === 'phone' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Celular / WhatsApp */}
                  <div className="p-3 bg-[#0B0F19] rounded-lg border border-gray-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[11px] text-gray-400 block font-medium flex items-center gap-1">
                        <MessageSquare className="h-3 w-3 text-emerald-400" />
                        Celular / WhatsApp
                      </span>
                      {currentLead.mobile ? (
                        <a
                          href={`tel:${currentLead.mobile.replace(/\D/g, '')}`}
                          className="text-emerald-300 font-mono font-semibold hover:text-emerald-200 transition-colors block truncate"
                        >
                          {currentLead.mobile}
                        </a>
                      ) : (
                        <span className="text-gray-500 italic block">Não informado</span>
                      )}
                    </div>
                    {currentLead.mobile && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleCopy(currentLead.mobile!, 'Celular', 'mobile')}
                          className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-800"
                          title="Copiar celular"
                        >
                          {copiedKey === 'mobile' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* E-mail */}
                  <div className="p-3 bg-[#0B0F19] rounded-lg border border-gray-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[11px] text-gray-400 block font-medium">E-mail Corporativo</span>
                      {currentLead.email ? (
                        <a
                          href={`mailto:${currentLead.email}`}
                          className="text-blue-300 hover:text-blue-200 font-mono text-xs block truncate"
                          title={currentLead.email}
                        >
                          {currentLead.email}
                        </a>
                      ) : (
                        <span className="text-gray-500 italic block">Não informado</span>
                      )}
                    </div>
                    {currentLead.email && (
                      <button
                        onClick={() => handleCopy(currentLead.email, 'E-mail', 'email')}
                        className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-800 shrink-0"
                        title="Copiar e-mail"
                      >
                        {copiedKey === 'email' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* CARD: HISTÓRICO DE INTERAÇÕES COMERCIAL */}
              <div className="bg-[#121826] border border-gray-800 rounded-xl p-4 sm:p-5 space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-800/80 pb-2.5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="h-4 w-4 text-seguranca-yellow" />
                    Histórico de Interações
                  </h3>
                </div>

                <div className="max-h-72 overflow-y-auto pr-1">
                  <LeadHistory leadId={String(currentLead.id)} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RODAPÉ DO MODAL COM AÇÕES E FECHAMENTO */}
        <div className="p-4 sm:p-5 bg-[#090D16] border-t border-gray-800 flex flex-wrap items-center justify-between gap-2">
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onDelete(currentLead.id);
              }}
              className="border-red-900/60 bg-red-950/20 text-red-400 hover:bg-red-900/40 hover:text-red-300 text-xs h-9 px-3"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Excluir Lead
            </Button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-gray-700 bg-[#121826] text-gray-300 hover:bg-gray-800 hover:text-white text-xs h-9 px-4"
            >
              Fechar
            </Button>

            <Button
              size="sm"
              onClick={() => {
                onClose();
                onEdit(currentLead);
              }}
              className="bg-seguranca-yellow hover:bg-yellow-500 text-black font-bold text-xs h-9 px-4"
            >
              <Edit className="h-3.5 w-3.5 mr-1.5" />
              Editar Lead
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadViewModal;
