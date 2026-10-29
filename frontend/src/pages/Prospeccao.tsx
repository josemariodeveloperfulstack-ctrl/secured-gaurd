import React, { useState } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Building2, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  UserCheck, 
  Send, 
  MessageSquare, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Globe, 
  Share2, 
  TrendingUp, 
  Users, 
  Map, 
  Compass, 
  ExternalLink,
  Briefcase,
  Sparkles,
  Bot,
  Key,
  Settings,
  Save,
  History,
  ShoppingCart,
  Copy,
  Check,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import prospectionService, { 
  ProspectCompany, 
  ProspectionHistoryItem,
  Decisor,
  STRATEGIC_CNAES, 
  ESTADOS_BRASIL,
  ensureValidFormattedCnpj
} from '@/services/prospectionService';
import { validateCNPJ, validateCPF, formatCNPJ } from '@/utils/validation';
import { useNavigate } from 'react-router-dom';

const Prospeccao: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Estados dos filtros
  const [activeTab, setActiveTab] = useState<'cnpj' | 'segmento' | 'maps' | 'historico'>('segmento');
  const [cnpjInput, setCnpjInput] = useState('');
  const [selectedSetor, setSelectedSetor] = useState<string>('TODOS');
  const [selectedCnae, setSelectedCnae] = useState('TODOS');
  const [selectedUf, setSelectedUf] = useState('MG');
  const [municipioInput, setMunicipioInput] = useState('Uberlândia');
  const [mapsKeyword, setMapsKeyword] = useState('');

  // Estados de dados e execução
  const [loading, setLoading] = useState(false);
  const [prospects, setProspects] = useState<ProspectCompany[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<ProspectCompany | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Estados de Histórico de Pesquisas Gravadas no Banco
  const [historySearches, setHistorySearches] = useState<ProspectionHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingHistoryId, setLoadingHistoryId] = useState<number | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Estados para Busca e Localização Ativa de CNPJ
  const [searchingCnpjFor, setSearchingCnpjFor] = useState<string | null>(null);
  const [manualCnpjModalOpen, setManualCnpjModalOpen] = useState(false);
  const [targetCompanyForCnpj, setTargetCompanyForCnpj] = useState<ProspectCompany | null>(null);
  const [manualCnpjInput, setManualCnpjInput] = useState('');
  const [searchingManualCnpj, setSearchingManualCnpj] = useState(false);

  // Estados de ações
  const [sendingCrmId, setSendingCrmId] = useState<string | null>(null);
  const [sendingMarketingId, setSendingMarketingId] = useState<string | null>(null);

  // Estados de Edição e Exclusão de Prospectos
  const [editingProspect, setEditingProspect] = useState<ProspectCompany | null>(null);
  const [editProspectModalOpen, setEditProspectModalOpen] = useState(false);

  // Estados de Configuração de Chaves/Tokens de IA e Ferramentas
  const [credentialsModalOpen, setCredentialsModalOpen] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [credentialsStatus, setCredentialsStatus] = useState<any>(null);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState('');
  const [googlePlacesApiKeyInput, setGooglePlacesApiKeyInput] = useState('');
  const [apifyTokenInput, setApifyTokenInput] = useState('');
  const [apolloApiKeyInput, setApolloApiKeyInput] = useState('');
  const [cnpjaApiKeyInput, setCnpjaApiKeyInput] = useState('');
  const [geminiModelInput, setGeminiModelInput] = useState('gemini-1.5-flash');

  // Carregar status das credenciais e histórico
  const loadCredentials = async () => {
    try {
      const data = await prospectionService.getCredentialsStatus();
      setCredentialsStatus(data);
      if (data.model) setGeminiModelInput(data.model);
    } catch (err) {
      console.warn('Não foi possível carregar o status das credenciais:', err);
    }
  };

  const sanitizeCompany = (c: any): ProspectCompany => ({
    ...c,
    cnpj: ensureValidFormattedCnpj(c?.cnpj, `${c?.razaoSocial || c?.nomeFantasia || 'empresa'}|${c?.municipio || ''}`),
    situacaoCadastral: c?.situacaoCadastral || 'ATIVA',
    qsa: Array.isArray(c?.qsa) ? c.qsa : [],
    decisores: Array.isArray(c?.decisores) ? c.decisores : [],
  });

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const data: any = await prospectionService.getHistory(0, 30);
      const items = Array.isArray(data)
        ? data
        : (data && Array.isArray(data.content) ? data.content : []);
      setHistorySearches(items);
    } catch (err) {
      console.warn('Não foi possível carregar o histórico de prospecções:', err);
      setHistorySearches([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleLoadPastSearch = async (item: ProspectionHistoryItem) => {
    try {
      setLoadingHistoryId(item.id);
      const searchDetails: any = await prospectionService.getHistoryDetails(item.id);
      const rawList = searchDetails ? (searchDetails.prospects || searchDetails.companies || []) : [];
      if (Array.isArray(rawList) && rawList.length > 0) {
        const safeCompanies: ProspectCompany[] = rawList.map(sanitizeCompany);
        setProspects(safeCompanies);
        toast({
          title: 'Histórico carregado do banco de dados!',
          description: `${safeCompanies.length} empresas recuperadas da pesquisa de ${item.termoPesquisa || item.cidade}.`,
        });
      } else {
        toast({
          title: 'Nenhum registro encontrado',
          description: 'Esta pesquisa não continha empresas salvas.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar pesquisa',
        description: err.message || 'Falha ao recuperar empresas do histórico.',
        variant: 'destructive',
      });
    } finally {
      setLoadingHistoryId(null);
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
    toast({
      title: 'E-mail copiado!',
      description: email,
    });
  };

  React.useEffect(() => {
    loadCredentials();
    loadHistory();
  }, []);

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingCredentials(true);
      await prospectionService.updateCredentials({
        geminiApiKey: geminiApiKeyInput,
        googlePlacesApiKey: googlePlacesApiKeyInput,
        apifyApiToken: apifyTokenInput,
        apolloApiKey: apolloApiKeyInput,
        cnpjaApiKey: cnpjaApiKeyInput,
        model: geminiModelInput,
      });
      toast({
        title: 'Chaves atualizadas com sucesso!',
        description: 'As configurações de IA, Google Maps, Apify e Apollo estão ativas.',
      });
      setGeminiApiKeyInput('');
      setGooglePlacesApiKeyInput('');
      setApifyTokenInput('');
      setApolloApiKeyInput('');
      setCnpjaApiKeyInput('');
      await loadCredentials();
      setCredentialsModalOpen(false);
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar credenciais',
        description: err.message || 'Falha ao comunicar com o servidor.',
        variant: 'destructive',
      });
    } finally {
      setSavingCredentials(false);
    }
  };

  // Busca com IA por Nicho / Palavra-chave e Região
  const handleSearchSegmento = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cidade = municipioInput.trim() || 'Uberlândia';

    // Montar termo rico combinando Nicho + CNAE + Setor (Indústria, Comercial, Agro, etc.)
    const partesSegmento: string[] = [];
    if (mapsKeyword.trim()) {
      partesSegmento.push(mapsKeyword.trim());
    }

    if (selectedSetor !== 'TODOS') {
      const setorLabels: Record<string, string> = {
        AGRO: 'Agronegócio, Fazendas e Silos',
        INDUSTRIA: 'Indústria, Manufatura e Fábricas',
        COMERCIO: 'Comércio, Atacado, Supermercados e Concessionárias',
        LOGISTICA: 'Centros de Distribuição e Logística',
        FACILITIES: 'Condomínios e Centros Empresariais',
        SAUDE: 'Hospitais, Clínicas e Centros de Diagnóstico',
        SEGURANCA: 'Segurança e Vigilância',
      };
      partesSegmento.push(setorLabels[selectedSetor] || selectedSetor);
    }

    if (selectedCnae && selectedCnae !== 'TODOS') {
      const cnaeObj = STRATEGIC_CNAES.find(c => c.codigo === selectedCnae);
      if (cnaeObj) partesSegmento.push(`CNAE: ${cnaeObj.label}`);
    }

    const termoNicho = partesSegmento.length > 0 
      ? partesSegmento.join(' | ') 
      : 'Empresas, Indústrias, Comércios e Agronegócio';

    try {
      setLoading(true);
      const results = await prospectionService.searchWithAi(cidade, selectedUf, termoNicho, 10);
      if (Array.isArray(results) && results.length > 0) {
        const safeResults = results.map(sanitizeCompany);
        setProspects(safeResults);
        loadHistory();
        toast({
          title: `🎯 ${safeResults.length} empresas reais localizadas em ${cidade}!`,
          description: 'Higienizados sem contatos de contabilidade e com presença real confirmada.',
        });
      } else {
        toast({
          title: 'Nenhum prospecto retornado',
          description: 'Tente alterar a palavra-chave, setor ou cidade.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Erro na busca de prospecção',
        description: err.message || 'Falha ao buscar empresas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Busca por CNPJ
  const handleSearchCnpj = async (e?: React.FormEvent, cnpjToSearch?: string) => {
    if (e) e.preventDefault();
    const targetCnpj = cnpjToSearch || cnpjInput;
    if (!targetCnpj.trim()) {
      toast({
        title: 'Informe o CNPJ',
        description: 'Digite um CNPJ válido com 14 números.',
        variant: 'destructive',
      });
      return;
    }

    if (!validateCNPJ(targetCnpj)) {
      toast({
        title: 'CNPJ inválido',
        description: 'O número informado não é um CNPJ válido da Receita Federal.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const company = await prospectionService.searchByCnpj(targetCnpj);
      const safeCompany = sanitizeCompany(company);
      setProspects(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const filtered = safePrev.filter(p => p.cnpj !== safeCompany.cnpj);
        return [safeCompany, ...filtered];
      });
      loadHistory();
      toast({
        title: 'Empresa localizada com dados oficiais!',
        description: `${company.razaoSocial} carregada diretamente da base oficial da Receita Federal.`,
      });
    } catch (err: any) {
      toast({
        title: 'Erro na consulta',
        description: err.message || 'Não foi possível encontrar dados do CNPJ.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Excluir / Descartar prospecto da lista
  const handleDeleteProspect = (company: ProspectCompany) => {
    const compName = company.nomeFantasia || company.razaoSocial || 'Empresa';
    setProspects(prev => (Array.isArray(prev) ? prev.filter(p => p !== company && p.cnpj !== company.cnpj) : []));
    toast({
      title: 'Lead descartado',
      description: `${compName} foi removido dos resultados da busca.`,
    });
  };

  // Iniciar edição manual de um prospecto
  const handleStartEditProspect = (company: ProspectCompany) => {
    setEditingProspect({ ...company });
    setEditProspectModalOpen(true);
  };

  // Salvar alterações de um prospecto editado
  const handleSaveEditedProspect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProspect) return;

    setProspects(prev => (Array.isArray(prev) ? prev.map(p => {
      const isMatch = (editingProspect.cnpj && p.cnpj === editingProspect.cnpj) ||
        (p.razaoSocial === editingProspect.razaoSocial && p.municipio === editingProspect.municipio);
      return isMatch ? { ...editingProspect } : p;
    }) : []));

    toast({
      title: 'Lead atualizado!',
      description: 'As alterações na empresa e canais de contato foram salvas com sucesso.',
    });
    setEditProspectModalOpen(false);
    setEditingProspect(null);
  };

  // Localizar e enriquecer CNPJ de um card com IA e Receita Federal
  const handleSearchCnpjForCompany = async (company: ProspectCompany) => {
    const companyName = company.nomeFantasia || company.razaoSocial;
    if (!companyName) {
      toast({
        title: 'Nome não identificado',
        description: 'Não foi possível identificar o nome da empresa para busca.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSearchingCnpjFor(companyName);
      const result = await prospectionService.findCnpjByName(companyName, company.municipio, company.uf);

      if (result && result.cnpj && result.cnpj !== '00.000.000/0001-00' && result.found !== false) {
        // Encontrou e validou dados oficiais!
        setProspects(prev => (Array.isArray(prev) ? prev : []).map(p => {
          const isMatch = (company.cnpj && p.cnpj === company.cnpj) ||
            ((p.nomeFantasia || p.razaoSocial) === companyName && p.municipio === company.municipio);
          
          if (!isMatch) return p;

          return {
            ...p,
            ...result,
            qsa: Array.isArray(result.qsa) ? result.qsa : (Array.isArray(p.qsa) ? p.qsa : []),
            decisores: Array.isArray(result.decisores) ? result.decisores : (Array.isArray(p.decisores) ? p.decisores : []),
            // Preservar links e diagnósticos gerados previamente
            googleMapsUrl: p.googleMapsUrl || result.googleMapsUrl,
            website: p.website || result.website,
            motivoConversao: p.motivoConversao || result.motivoConversao,
            scoreConversao: p.scoreConversao || result.scoreConversao,
            situacaoCadastral: result.situacaoCadastral || 'ATIVA',
            clientePotencial: true,
            origem: 'RECEITA_FEDERAL',
            leadImported: p.leadImported,
            importedLeadId: p.importedLeadId,
          };
        }));

        if (selectedCompany && (
          (company.cnpj && selectedCompany.cnpj === company.cnpj) ||
          ((selectedCompany.nomeFantasia || selectedCompany.razaoSocial) === companyName)
        )) {
          setSelectedCompany(prev => prev ? {
            ...prev,
            ...result,
            qsa: Array.isArray(result.qsa) ? result.qsa : (Array.isArray(prev.qsa) ? prev.qsa : []),
            decisores: Array.isArray(result.decisores) ? result.decisores : (Array.isArray(prev.decisores) ? prev.decisores : []),
            situacaoCadastral: result.situacaoCadastral || 'ATIVA',
          } : null);
        }

        toast({
          title: '🎯 CNPJ localizado e autenticado!',
          description: `${result.razaoSocial || companyName} (${result.cnpj}) foi autenticado na base oficial da Receita Federal com sócios e endereço.`,
        });
      } else {
        // Não encontrou automaticamente -> abre modal amigável com atalho do Google e campo formatado
        setTargetCompanyForCnpj(company);
        setManualCnpjInput('');
        setManualCnpjModalOpen(true);
        toast({
          title: 'CNPJ não localizado automaticamente',
          description: `Não encontramos um CNPJ público exato para "${companyName}". Informe o CNPJ para consultar diretamente na Receita.`,
        });
      }
    } catch (err: any) {
      console.warn('Erro na busca automática de CNPJ:', err);
      setTargetCompanyForCnpj(company);
      setManualCnpjInput('');
      setManualCnpjModalOpen(true);
    } finally {
      setSearchingCnpjFor(null);
    }
  };

  // Confirmar CNPJ manual e consultar dados na Receita Federal
  const handleConfirmManualCnpj = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetCompanyForCnpj) return;

    const rawDigits = manualCnpjInput.replace(/\D/g, '');
    if (rawDigits.length !== 14 || !validateCNPJ(rawDigits)) {
      toast({
        title: 'CNPJ inválido',
        description: 'Por favor, informe um CNPJ real com 14 dígitos e verificação válida.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSearchingManualCnpj(true);
      const companyOfficial = await prospectionService.searchByCnpj(rawDigits);
      const targetName = targetCompanyForCnpj.nomeFantasia || targetCompanyForCnpj.razaoSocial;

      setProspects(prev => (Array.isArray(prev) ? prev : []).map(p => {
        const isMatch = (targetCompanyForCnpj.cnpj && p.cnpj === targetCompanyForCnpj.cnpj) ||
          ((p.nomeFantasia || p.razaoSocial) === targetName && p.municipio === targetCompanyForCnpj.municipio);

        if (!isMatch) return p;

        return {
          ...p,
          ...companyOfficial,
          qsa: Array.isArray(companyOfficial.qsa) ? companyOfficial.qsa : (Array.isArray(p.qsa) ? p.qsa : []),
          decisores: Array.isArray(companyOfficial.decisores) ? companyOfficial.decisores : (Array.isArray(p.decisores) ? p.decisores : []),
          googleMapsUrl: p.googleMapsUrl || companyOfficial.googleMapsUrl,
          website: p.website || companyOfficial.website,
          motivoConversao: p.motivoConversao || companyOfficial.motivoConversao,
          scoreConversao: p.scoreConversao || companyOfficial.scoreConversao,
          situacaoCadastral: companyOfficial.situacaoCadastral || 'ATIVA',
          clientePotencial: true,
          origem: 'RECEITA_FEDERAL',
          leadImported: p.leadImported,
          importedLeadId: p.importedLeadId,
        };
      }));

      if (selectedCompany && (
        (targetCompanyForCnpj.cnpj && selectedCompany.cnpj === targetCompanyForCnpj.cnpj) ||
        ((selectedCompany.nomeFantasia || selectedCompany.razaoSocial) === targetName)
      )) {
        setSelectedCompany(prev => prev ? {
          ...prev,
          ...companyOfficial,
          qsa: Array.isArray(companyOfficial.qsa) ? companyOfficial.qsa : (Array.isArray(prev.qsa) ? prev.qsa : []),
          decisores: Array.isArray(companyOfficial.decisores) ? companyOfficial.decisores : (Array.isArray(prev.decisores) ? prev.decisores : []),
          situacaoCadastral: companyOfficial.situacaoCadastral || 'ATIVA',
        } : null);
      }

      setManualCnpjModalOpen(false);
      setTargetCompanyForCnpj(null);
      setManualCnpjInput('');

      toast({
        title: 'CNPJ vinculado e dados autenticados!',
        description: `${companyOfficial.razaoSocial} foi atualizada com dados cadastrais e societários oficiais da Receita Federal.`,
      });
    } catch (err: any) {
      toast({
        title: 'Erro ao consultar CNPJ',
        description: err.message || 'Não foi possível encontrar a empresa na base da Receita Federal.',
        variant: 'destructive',
      });
    } finally {
      setSearchingManualCnpj(false);
    }
  };

  // Enviar para o CRM (Kanban)
  const handleSendToCrm = async (company: ProspectCompany) => {
    try {
      setSendingCrmId(company.cnpj);
      const lead = await prospectionService.sendToCrm(company);
      
      setProspects(prev => (Array.isArray(prev) ? prev : []).map(p => p.cnpj === company.cnpj ? { ...p, leadImported: true, importedLeadId: lead.id } : p));
      if (selectedCompany?.cnpj === company.cnpj) {
        setSelectedCompany(prev => prev ? { ...prev, leadImported: true, importedLeadId: lead.id } : null);
      }

      toast({
        title: 'Lead enviado para o CRM!',
        description: `${company.nomeFantasia || company.razaoSocial} foi adicionado à primeira coluna do Kanban.`,
      });
    } catch (err: any) {
      toast({
        title: 'Erro ao enviar para CRM',
        description: err.message || 'Não foi possível cadastrar o lead no CRM.',
        variant: 'destructive',
      });
    } finally {
      setSendingCrmId(null);
    }
  };

  // Enviar para lista de E-mail Marketing
  const handleSendToMarketing = async (company: ProspectCompany) => {
    if (!company.email) {
      toast({
        title: 'Sem e-mail',
        description: 'Esta empresa não possui e-mail cadastrado.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSendingMarketingId(company.cnpj);
      await prospectionService.addToEmailMarketing(company);
      toast({
        title: 'Adicionado ao E-mail Marketing!',
        description: `${company.email} adicionado à lista de Prospecção Comercial.`,
      });
    } catch (err: any) {
      toast({
        title: 'Erro no E-mail Marketing',
        description: err.message || 'Não foi possível salvar na lista de marketing.',
        variant: 'destructive',
      });
    } finally {
      setSendingMarketingId(null);
    }
  };

  // Abrir WhatsApp com mensagem pronta
  const handleOpenWhatsApp = (phone: string, company: ProspectCompany, personName?: string) => {
    const link = prospectionService.getWhatsAppLink(phone, company, personName);
    window.open(link, '_blank');
  };

  return (
    <StandardLayout>
      <div className="space-y-6 p-4 sm:p-6 bg-seguranca-black min-h-screen text-seguranca-lightgray">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-seguranca-graphite pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-seguranca-yellow flex items-center gap-2">
            <Compass className="h-7 w-7 text-seguranca-yellow" />
            Prospecção Comercial de Leads
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Descubra empresas, qualifique tomadores de decisão (sócios/compras) e converta em oportunidades no CRM com 1 clique.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCredentialsModalOpen(true)}
            className="border-amber-500/80 text-amber-300 hover:bg-amber-500 hover:text-black text-xs sm:text-sm font-semibold flex items-center gap-1.5"
            title="Configurar chaves de API: Google Places, Apify Maps, Apollo.io e Gemini IA"
          >
            <Key className="h-4 w-4 text-amber-400" />
            Chaves & IA
            {(credentialsStatus?.geminiConfigured || credentialsStatus?.apifyConfigured || credentialsStatus?.googlePlacesConfigured || credentialsStatus?.apolloConfigured) && (
              <span className="h-2 w-2 rounded-full bg-green-500 inline-block ml-0.5" title="Serviços de Prospecção Ativos" />
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/crm')}
            className="border-seguranca-yellow text-seguranca-yellow hover:bg-seguranca-yellow hover:text-black font-semibold text-xs sm:text-sm"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Ver Funil no CRM
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/comercial/marketing')}
            className="border-gray-600 text-gray-300 hover:bg-seguranca-graphite text-xs sm:text-sm"
          >
            <Mail className="h-4 w-4 mr-2" />
            E-mail Marketing
          </Button>
        </div>
      </div>

      {/* Painel de Busca e Filtros */}
      <Card className="bg-seguranca-graphite border-gray-700 shadow-xl">
        <CardContent className="p-4 sm:p-6">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
            <TabsList className="bg-seguranca-black border border-gray-700 p-1 mb-6 flex-wrap h-auto gap-1">
              <TabsTrigger 
                value="segmento" 
                className="data-[state=active]:bg-seguranca-yellow data-[state=active]:text-black text-xs sm:text-sm font-medium flex items-center gap-1.5"
              >
                <Sparkles className="h-4 w-4 text-amber-400 data-[state=active]:text-black" />
                🎯 Prospecção Inteligente por Nicho & Região
              </TabsTrigger>
              <TabsTrigger 
                value="cnpj" 
                className="data-[state=active]:bg-seguranca-yellow data-[state=active]:text-black text-xs sm:text-sm font-medium flex items-center gap-1.5"
              >
                <Building2 className="h-4 w-4" />
                🏢 Consulta e Enriquecimento de CNPJ
              </TabsTrigger>
              <TabsTrigger 
                value="historico" 
                onClick={loadHistory}
                className="data-[state=active]:bg-seguranca-yellow data-[state=active]:text-black text-xs sm:text-sm font-medium flex items-center gap-1.5"
              >
                <History className="h-4 w-4" />
                📜 Histórico de Pesquisas ({Array.isArray(historySearches) ? historySearches.length : 0})
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: PROSPECÇÃO COM IA & PALAVRA-CHAVE */}
            <TabsContent value="segmento" className="space-y-4">
              <form onSubmit={handleSearchSegmento} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs text-gray-300 font-semibold">Palavra-chave ou Nicho Específico</Label>
                  <Input
                    placeholder="Ex: Condomínio Edifício, Centro Logístico, Hospital, Concessionária..."
                    value={mapsKeyword}
                    onChange={(e) => setMapsKeyword(e.target.value)}
                    className="bg-seguranca-black border-gray-600 text-white h-10 placeholder-gray-500"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-300 font-semibold">Cidade Alvo *</Label>
                  <Input
                    placeholder="Ex: Uberlândia, Araguari, Campinas..."
                    value={municipioInput}
                    onChange={(e) => setMunicipioInput(e.target.value)}
                    className="bg-seguranca-black border-gray-600 text-white h-10"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-300 font-semibold">Estado (UF)</Label>
                  <Select value={selectedUf} onValueChange={setSelectedUf}>
                    <SelectTrigger className="bg-seguranca-black border-gray-600 text-white h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-black border-gray-700 text-white max-h-72">
                      {ESTADOS_BRASIL.map((uf) => (
                        <SelectItem key={uf.sigla} value={uf.sigla}>
                          {uf.sigla} - {uf.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-300 font-semibold">Setor Econômico</Label>
                  <Select 
                    value={selectedSetor} 
                    onValueChange={(val) => {
                      setSelectedSetor(val);
                      setSelectedCnae('TODOS');
                    }}
                  >
                    <SelectTrigger className="bg-seguranca-black border-gray-600 text-white h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-black border-gray-700 text-white">
                      <SelectItem value="TODOS">🌐 Todos os Setores</SelectItem>
                      <SelectItem value="AGRO">🌾 Agronegócio & Silos</SelectItem>
                      <SelectItem value="INDUSTRIA">🏭 Indústria & Manufatura</SelectItem>
                      <SelectItem value="COMERCIO">🏬 Comercial, Varejo & Atacado</SelectItem>
                      <SelectItem value="LOGISTICA">🚚 Centros de Distribuição & Logística</SelectItem>
                      <SelectItem value="FACILITIES">🏢 Condomínios & Facilities</SelectItem>
                      <SelectItem value="SAUDE">🏥 Saúde & Hospitalar</SelectItem>
                      <SelectItem value="SEGURANCA">🛡️ Segurança & Vigilância</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2 space-y-1">
                  <Label className="text-xs text-gray-300 font-semibold">CNAE / Atividade Específica (Opcional)</Label>
                  <Select value={selectedCnae} onValueChange={setSelectedCnae}>
                    <SelectTrigger className="bg-seguranca-black border-gray-600 text-white h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-black border-gray-700 text-white max-h-72">
                      {STRATEGIC_CNAES
                        .filter(c => selectedSetor === 'TODOS' || c.setor === 'TODOS' || c.setor === selectedSetor)
                        .map((c) => (
                          <SelectItem key={c.codigo} value={c.codigo}>
                            {c.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-1 flex items-end">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-seguranca-yellow hover:bg-yellow-500 text-black font-bold h-10 px-4 shadow-md"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Prospectar Leads
                  </Button>
                </div>

                <div className="md:col-span-4 flex items-center justify-between pt-1 border-t border-gray-800 text-xs">
                  <span className="text-amber-400/90 flex items-center gap-1.5">
                    <Bot className="h-4 w-4 text-amber-400" />
                    Higienização automática ativa: ignora e-mails de escritórios contábeis e prioriza contatos diretos e decisores reais.
                  </span>
                </div>
              </form>
            </TabsContent>

            {/* ABA 2: CNPJ DIRETO */}
            <TabsContent value="cnpj" className="space-y-4">
              <form onSubmit={handleSearchCnpj} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Input
                    placeholder="Digite o CNPJ (somente números ou formatado)..."
                    value={cnpjInput}
                    onChange={(e) => setCnpjInput(e.target.value)}
                    className="bg-seguranca-black border-gray-600 text-white placeholder-gray-500 h-11 text-base focus:border-seguranca-yellow"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-seguranca-yellow hover:bg-yellow-500 text-black font-bold h-11 px-6 shadow-md"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Search className="h-5 w-5 mr-2" />}
                  Prospectar & Enriquecer
                </Button>
              </form>
              <p className="text-xs text-gray-400">
                💡 Consulta a base oficial, higieniza contatos de contabilidade e traz Sócios/Decisores (QSA), Telefones comerciais e CNAE.
              </p>
            </TabsContent>

            {/* ABA 3: HISTÓRICO DE PESQUISAS SALVAS NO BANCO */}
            <TabsContent value="historico" className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <History className="h-4 w-4 text-seguranca-yellow" />
                    Últimas Pesquisas Gravadas no Banco de Dados
                  </h3>
                  <p className="text-xs text-gray-400">
                    Clique em "Carregar Resultados" para rever os prospects, sócios e e-mails de compras sem reconsultar as APIs.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadHistory}
                  disabled={loadingHistory}
                  className="border-gray-700 text-gray-300 hover:text-white text-xs h-8"
                >
                  {loadingHistory ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <History className="h-3.5 w-3.5 mr-1.5" />}
                  Atualizar Lista
                </Button>
              </div>

              {loadingHistory && (!Array.isArray(historySearches) || historySearches.length === 0) ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-seguranca-yellow" />
                  <span className="ml-2 text-sm text-gray-400">Carregando histórico do banco de dados...</span>
                </div>
              ) : (!Array.isArray(historySearches) || historySearches.length === 0) ? (
                <div className="p-8 text-center bg-seguranca-black/40 rounded-lg border border-dashed border-gray-700 space-y-2">
                  <History className="h-8 w-8 text-gray-600 mx-auto" />
                  <p className="text-sm text-gray-400">Nenhuma pesquisa gravada ainda.</p>
                  <p className="text-xs text-gray-500">
                    Faça uma busca por nicho ou por CNPJ para que ela seja registrada automaticamente aqui.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(Array.isArray(historySearches) ? historySearches : []).map((h) => {
                    const dataFormatada = h.createdAt
                      ? new Intl.DateTimeFormat('pt-BR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        }).format(new Date(h.createdAt))
                      : 'Data não informada';

                    const isCurrentLoading = loadingHistoryId === h.id;

                    return (
                      <div
                        key={h.id}
                        className="p-3.5 rounded-lg bg-seguranca-black/60 border border-gray-700 hover:border-seguranca-yellow/50 transition-all flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] uppercase font-bold">
                              {h.tipoPesquisa || 'PESQUISA'}
                            </Badge>
                            <span className="text-[11px] text-gray-400 font-mono">
                              {dataFormatada}
                            </span>
                          </div>

                          <div className="text-sm font-semibold text-white truncate" title={h.termoPesquisa || h.segmento || h.cidade}>
                            {h.termoPesquisa || h.segmento || 'Busca Geral'}
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <MapPin className="h-3.5 w-3.5 text-seguranca-yellow shrink-0" />
                            <span>{h.cidade ? `${h.cidade} - ${h.uf || 'BR'}` : (h.uf || 'Brasil')}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                            <Users className="h-3.5 w-3.5 shrink-0" />
                            <span>{h.totalEncontrados ?? (h as any).totalEmpresasEncontradas ?? 0} empresa(s) gravada(s)</span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleLoadPastSearch(h)}
                          disabled={isCurrentLoading}
                          className="w-full bg-seguranca-yellow hover:bg-yellow-500 text-black font-bold h-8 text-xs flex items-center justify-center gap-1.5"
                        >
                          {isCurrentLoading ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Carregando...
                            </>
                          ) : (
                            <>
                              <History className="h-3.5 w-3.5" />
                              Carregar Resultados
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Resultados da Prospecção */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-seguranca-yellow" />
            Leads e Empresas Encontradas ({Array.isArray(prospects) ? prospects.length : 0})
          </h2>
          {Array.isArray(prospects) && prospects.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setProspects([])}
              className="text-gray-400 hover:text-white"
            >
              Limpar Resultados
            </Button>
          )}
        </div>

        {(!Array.isArray(prospects) || prospects.length === 0) ? (
          <div className="bg-seguranca-graphite/40 border border-dashed border-gray-700 rounded-lg p-12 text-center space-y-3">
            <Building2 className="h-12 w-12 text-gray-600 mx-auto" />
            <h3 className="text-base font-semibold text-gray-300">Nenhum prospecto carregado no momento</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Utilize o campo de busca acima para digitar um CNPJ ou buscar por segmento e região. Os resultados serão enriquecidos com sócios e canais de contato.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(Array.isArray(prospects) ? prospects : []).map((company, index) => {
              const decisorPrincipal = (Array.isArray(company.qsa) && company.qsa.length > 0) ? company.qsa[0] : null;
              const uniqueKey = (company.cnpj && company.cnpj.trim() !== '' && company.cnpj !== '00.000.000/0001-00')
                ? company.cnpj
                : `prospect-${company.razaoSocial || company.nomeFantasia || 'lead'}-${index}`;

              return (
                <Card 
                  key={uniqueKey} 
                  className="bg-seguranca-graphite border-gray-700 hover:border-seguranca-yellow/50 transition-all flex flex-col justify-between"
                >
                  <CardHeader className="pb-3 border-b border-gray-700/60">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          {company.cnpj && company.cnpj !== '00.000.000/0001-00' && (
                            <Badge className="bg-seguranca-yellow text-black font-bold text-[10px]">
                              CNPJ: {company.cnpj}
                            </Badge>
                          )}
                          {company.clientePotencial && (
                            <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[10px] flex items-center gap-1 font-bold">
                              🔥 Lead com Alto Potencial
                            </Badge>
                          )}
                          {company.scoreConversao && (
                            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] flex items-center gap-1 font-semibold">
                              <Sparkles className="h-3 w-3 text-emerald-400" />
                              Score IA: {company.scoreConversao}%
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-base sm:text-lg font-bold text-white leading-tight">
                          {company.nomeFantasia || company.razaoSocial}
                        </CardTitle>
                        {company.nomeFantasia && company.nomeFantasia !== company.razaoSocial && (
                          <CardDescription className="text-xs text-gray-400 mt-0.5">
                            Razão Social: {company.razaoSocial}
                          </CardDescription>
                        )}
                      </div>
                      <Badge 
                        variant="outline" 
                        onClick={() => !company.cnpj && handleSearchCnpjForCompany(company)}
                        className={
                          company.situacaoCadastral === 'ATIVA' 
                            ? 'border-green-500 text-green-400 shrink-0' 
                            : 'border-amber-500 text-amber-400 shrink-0 cursor-pointer hover:bg-amber-500/10 transition-colors'
                        }
                        title={company.cnpj ? 'Empresa com CNPJ verificado e ativo' : 'Clique para localizar e verificar CNPJ na Receita Federal'}
                      >
                        {searchingCnpjFor === (company.nomeFantasia || company.razaoSocial) ? (
                          <span className="flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" /> Verificando...
                          </span>
                        ) : (
                          company.situacaoCadastral
                        )}
                      </Badge>
                    </div>

                    {company.motivoConversao && (
                      <div className="mt-2 text-[11px] bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded p-2 flex items-start gap-1.5">
                        <Bot className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span><strong>Diagnóstico IA:</strong> {company.motivoConversao}</span>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="py-4 space-y-3 text-xs sm:text-sm">
                    {/* Endereço e Localização */}
                    <div className="flex items-start gap-2 text-gray-300">
                      <MapPin className="h-4 w-4 text-seguranca-yellow shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium text-white">{company.municipio} - {company.uf}</span>
                        {company.bairro && <span className="text-gray-400"> ({company.bairro})</span>}
                        {company.logradouro && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {company.logradouro}, {company.numero} {company.complemento ? `- ${company.complemento}` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* CNAE / Atividade */}
                    {company.cnaePrincipal && (
                      <div className="flex items-start gap-2 text-gray-300">
                        <Briefcase className="h-4 w-4 text-seguranca-yellow shrink-0 mt-0.5" />
                        <span className="text-xs text-gray-300 line-clamp-2">
                          <strong className="text-white font-medium">Atividade:</strong> {company.cnaePrincipal.descricao}
                        </span>
                      </div>
                    )}

                    {/* Setor de Compras / Suprimentos */}
                    {company.emailCompras && (
                      <div className="flex items-center justify-between gap-2 p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-xs">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <ShoppingCart className="h-4 w-4 text-amber-400 shrink-0" />
                          <div className="truncate">
                            <span className="font-semibold text-amber-300 block text-[11px]">Setor de Compras / Suprimentos:</span>
                            <span className="text-white font-mono">{company.emailCompras}</span>
                            {company.contatoComprasNome && (
                              <span className="text-gray-400 ml-1.5 font-sans">({company.contatoComprasNome})</span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyEmail(company.emailCompras!)}
                          className="h-7 px-2 text-xs text-amber-300 hover:text-white hover:bg-amber-500/20 shrink-0"
                          title="Copiar e-mail de compras"
                        >
                          {copiedEmail === company.emailCompras ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    )}

                    {/* Sócios / Tomadores de Decisão (QSA) */}
                    <div className="flex items-start gap-2 text-gray-300 bg-seguranca-black/40 p-2.5 rounded border border-gray-700/50">
                      <UserCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="w-full">
                        <span className="text-xs font-semibold text-emerald-400 block mb-0.5">
                          Tomador(es) de Decisão (QSA):
                        </span>
                        {Array.isArray(company.qsa) && company.qsa.length > 0 ? (
                          <div className="space-y-1">
                            {company.qsa.slice(0, 3).map((s, idx) => (
                              <div key={idx} className="flex flex-col gap-0.5 py-1 border-b border-gray-800/60 last:border-0 text-xs text-white">
                                <div className="flex flex-wrap items-center justify-between gap-1">
                                  <div>
                                    • <strong>{s.nome}</strong> <span className="text-gray-400">({s.qualificacao || s.cargo || 'Sócio Decisor'})</span>
                                  </div>
                                  {s.telefone && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenWhatsApp(s.telefone!, company, s.nome)}
                                      className="flex items-center gap-1 text-[11px] text-green-400 hover:text-green-300 font-medium"
                                      title="Chamar sócio decisor no WhatsApp"
                                    >
                                      <Phone className="h-3 w-3" />
                                      <span>{s.telefone}</span>
                                    </button>
                                  )}
                                </div>
                                {s.email && (
                                  <div className="flex items-center gap-1 font-mono text-emerald-300 text-[11px] pl-2.5">
                                    <Mail className="h-3 w-3 text-emerald-400 shrink-0" />
                                    <span className="truncate">{s.email}</span>
                                    <button type="button" onClick={() => handleCopyEmail(s.email!)} className="hover:text-white p-0.5" title="Copiar e-mail do sócio">
                                      {copiedEmail === s.email ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                            {Array.isArray(company.qsa) && company.qsa.length > 2 && (
                              <span className="text-[11px] text-seguranca-yellow font-medium">
                                +{company.qsa.length - 2} outro(s) sócio(s)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">Quadro de sócios não informado na base pública</span>
                        )}
                      </div>
                    </div>

                    {/* Decisores Executivos (Apollo.io / Inferred) */}
                    {Array.isArray(company.decisores) && company.decisores.length > 0 && (
                      <div className="space-y-1.5 bg-seguranca-black/40 p-2.5 rounded border border-cyan-800/40">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5" />
                            Decisores Executivos Identificados:
                          </span>
                          <Badge className="bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px]">
                            {company.decisores.length} decisor(es)
                          </Badge>
                        </div>
                        {company.decisores.slice(0, 2).map((d, dIdx) => (
                          <div key={dIdx} className="flex flex-wrap items-center justify-between text-xs py-0.5">
                            <div>
                              <span className="text-white font-medium">• {d.nome}</span>
                              <span className="text-gray-400 ml-1">({d.cargo})</span>
                            </div>
                            {d.email && (
                              <div className="flex items-center gap-1 font-mono text-cyan-300 text-[11px] shrink-0">
                                <span>{d.email}</span>
                                <button onClick={() => handleCopyEmail(d.email!)} className="hover:text-white p-0.5" title="Copiar e-mail do decisor">
                                  {copiedEmail === d.email ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Contatos Disponíveis */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {company.telefone ? (
                        <div className="flex items-center gap-1.5 text-xs text-gray-300">
                          <Phone className="h-3.5 w-3.5 text-seguranca-yellow shrink-0" />
                          <span className="truncate">{company.telefone}</span>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 italic">Telefone não listado</div>
                      )}

                      {company.email ? (
                        <div className="flex items-center gap-1.5 text-xs text-gray-300">
                          <Mail className="h-3.5 w-3.5 text-seguranca-yellow shrink-0" />
                          <span className="truncate" title={company.email}>{company.email}</span>
                        </div>
                      ) : company.emailContabilidadeDescartado ? (
                        <div className="text-xs text-amber-400/90 italic flex items-center gap-1" title="E-mail de escritório de contabilidade descartado automaticamente para evitar contatos inválidos.">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          <span>E-mail contábil descartado</span>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 italic">E-mail não listado</div>
                      )}
                      {/* Presença Digital Real (Maps, Website, Redes Sociais) */}
                      {(company.googleMapsUrl || company.website || company.socialMediaUrl) && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-800">
                          {company.googleMapsUrl && (
                            <a
                              href={company.googleMapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-950/40 px-2 py-1 rounded border border-blue-900/50"
                            >
                              <MapPin className="h-3 w-3" />
                              Ver no Google Maps / Meu Negócio
                              <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                            </a>
                          )}
                          {company.website && (
                            <a
                              href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-gray-300 hover:text-white flex items-center gap-1 bg-gray-800/60 px-2 py-1 rounded border border-gray-700"
                            >
                              <Globe className="h-3 w-3 text-seguranca-yellow" />
                              Website Oficial
                              <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                            </a>
                          )}
                          {company.socialMediaUrl && (
                            <a
                              href={company.socialMediaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-pink-400 hover:text-pink-300 flex items-center gap-1 bg-pink-950/30 px-2 py-1 rounded border border-pink-900/40"
                            >
                              <Share2 className="h-3 w-3" />
                              Redes Sociais
                              <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>

                  {/* Barra de Ações Rápidas */}
                  <div className="p-3 bg-seguranca-black border-t border-gray-700 rounded-b-lg flex flex-wrap gap-2 items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      {company.telefone && (
                        <Button
                          size="sm"
                          onClick={() => handleOpenWhatsApp(company.telefone!, company)}
                          className="bg-green-600 hover:bg-green-700 text-white h-8 px-2.5 text-xs font-semibold"
                          title="Iniciar conversa no WhatsApp com saudação personalizada"
                        >
                          <MessageSquare className="h-3.5 w-3.5 mr-1" />
                          WhatsApp
                        </Button>
                      )}

                      {company.email && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendToMarketing(company)}
                          disabled={sendingMarketingId === company.cnpj}
                          className="border-gray-600 text-gray-300 hover:text-white h-8 px-2.5 text-xs"
                          title="Adicionar à lista de E-mail Marketing"
                        >
                          {sendingMarketingId === company.cnpj ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Mail className="h-3.5 w-3.5 mr-1 text-seguranca-yellow" />
                          )}
                          E-mail Mkt
                        </Button>
                      )}

                      {!company.cnpj ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSearchCnpjForCompany(company)}
                          disabled={searchingCnpjFor === (company.nomeFantasia || company.razaoSocial)}
                          className="border-seguranca-yellow text-seguranca-yellow hover:bg-seguranca-yellow hover:text-black h-8 px-2.5 text-xs font-medium"
                          title="Consultar CNPJ na Receita Federal para enriquecer dados oficiais"
                        >
                          {searchingCnpjFor === (company.nomeFantasia || company.razaoSocial) ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                              Buscando...
                            </>
                          ) : (
                            <>
                              <Search className="h-3.5 w-3.5 mr-1" />
                              Buscar CNPJ
                            </>
                          )}
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px] text-green-400 bg-green-950/40 border border-green-800/60 px-2 py-1 rounded">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
                          <span className="font-semibold">{company.cnpj}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedCompany(company);
                          setDetailsModalOpen(true);
                        }}
                        className="text-gray-300 hover:text-white h-8 px-2 text-xs flex items-center gap-1"
                        title="Ver detalhes completos do prospecto"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Detalhes</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStartEditProspect(company)}
                        className="text-gray-300 hover:text-amber-400 h-8 px-2 text-xs flex items-center gap-1"
                        title="Editar dados da empresa ou canais de contato"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Editar</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteProspect(company)}
                        className="text-red-400/80 hover:text-red-300 hover:bg-red-950/40 h-8 px-2 text-xs"
                        title="Descartar este lead da lista atual"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>

                      {company.leadImported ? (
                        <Button
                          size="sm"
                          disabled
                          className="bg-green-800 text-green-200 h-8 px-3 text-xs"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          No CRM
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            const readyCompany: ProspectCompany = {
                              ...company,
                              cnpj: ensureValidFormattedCnpj(company.cnpj, `${company.razaoSocial || company.nomeFantasia}|${company.municipio}`),
                            };
                            handleSendToCrm(readyCompany);
                          }}
                          disabled={sendingCrmId === company.cnpj}
                          className="bg-seguranca-yellow hover:bg-yellow-500 text-black font-bold h-8 px-3 text-xs"
                        >
                          {sendingCrmId === company.cnpj ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          ) : (
                            <TrendingUp className="h-3.5 w-3.5 mr-1" />
                          )}
                          Enviar p/ CRM
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Detalhes Completos da Empresa */}
      {selectedCompany && (
        <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
          <DialogContent className="max-w-3xl bg-seguranca-graphite border-gray-600 text-seguranca-lightgray max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-seguranca-yellow flex items-center gap-2">
                <Building2 className="h-6 w-6" />
                {selectedCompany.nomeFantasia || selectedCompany.razaoSocial}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Dados cadastrais e societários oficiais da Receita Federal.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-sm mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-seguranca-black p-4 rounded-lg border border-gray-700">
                <div>
                  <span className="text-xs text-gray-400 block">Razão Social:</span>
                  <span className="font-semibold text-white">{selectedCompany.razaoSocial}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">CNPJ:</span>
                  {selectedCompany.cnpj ? (
                    <span className="font-semibold text-seguranca-yellow">{selectedCompany.cnpj}</span>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-amber-400 text-xs italic">Não informado</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[11px] border-seguranca-yellow text-seguranca-yellow px-2 py-0"
                        onClick={() => {
                          handleSearchCnpjForCompany(selectedCompany);
                        }}
                        disabled={searchingCnpjFor === (selectedCompany.nomeFantasia || selectedCompany.razaoSocial)}
                      >
                        {searchingCnpjFor === (selectedCompany.nomeFantasia || selectedCompany.razaoSocial) ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Consultando...
                          </>
                        ) : (
                          <>
                            <Search className="h-3 w-3 mr-1" />
                            Buscar CNPJ na Receita
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Situação Cadastral:</span>
                  <Badge className={selectedCompany.cnpj ? "bg-green-600 text-white mt-1" : "bg-amber-600 text-white mt-1"}>
                    {selectedCompany.situacaoCadastral}
                  </Badge>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Porte da Empresa:</span>
                  <span className="text-white">{selectedCompany.porte || 'Não especificado'}</span>
                </div>
                {selectedCompany.capitalSocial && (
                  <div>
                    <span className="text-xs text-gray-400 block">Capital Social:</span>
                    <span className="text-white font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedCompany.capitalSocial)}
                    </span>
                  </div>
                )}
                {selectedCompany.dataInicioAtividade && (
                  <div>
                    <span className="text-xs text-gray-400 block">Início da Atividade:</span>
                    <span className="text-white">{selectedCompany.dataInicioAtividade}</span>
                  </div>
                )}
              </div>

              {/* Endereço */}
              <div className="bg-seguranca-black p-4 rounded-lg border border-gray-700 space-y-1">
                <h4 className="text-xs font-bold text-seguranca-yellow uppercase">Endereço Comercial</h4>
                <p className="text-white">
                  {selectedCompany.logradouro}, {selectedCompany.numero} {selectedCompany.complemento}
                </p>
                <p className="text-gray-400 text-xs">
                  Bairro: {selectedCompany.bairro || '-'} | {selectedCompany.municipio} - {selectedCompany.uf} | CEP: {selectedCompany.cep || '-'}
                </p>
              </div>

              {/* E-mail de Contato & Decisor */}
              {(selectedCompany.email || selectedCompany.emailCompras) && (
                <div className="bg-seguranca-black p-4 rounded-lg border border-blue-500/40 space-y-2">
                  <h4 className="text-xs font-bold text-blue-300 uppercase flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4" />
                      E-mail Corporativo / Decisor
                    </span>
                    <Badge className="bg-blue-950 text-blue-300 border border-blue-800 text-[10px]">
                      {selectedCompany.emailCompras ? 'Compras / Suprimentos' : 'Contato Verificado'}
                    </Badge>
                  </h4>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[11px]">E-mail:</span>
                      <span className="text-white font-mono font-semibold">{selectedCompany.emailCompras || selectedCompany.email}</span>
                      {selectedCompany.contatoComprasNome && (
                        <span className="text-gray-400 ml-2 font-sans">({selectedCompany.contatoComprasNome})</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyEmail((selectedCompany.emailCompras || selectedCompany.email)!)}
                        className="h-7 text-xs border-blue-500/50 text-blue-300 hover:bg-blue-500 hover:text-black"
                      >
                        {copiedEmail === (selectedCompany.emailCompras || selectedCompany.email) ? <Check className="h-3.5 w-3.5 mr-1 text-green-400" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                        Copiar
                      </Button>
                      <a
                        href={`mailto:${selectedCompany.emailCompras || selectedCompany.email}`}
                        className="inline-flex items-center justify-center h-7 px-3 text-xs font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                      >
                        <Mail className="h-3.5 w-3.5 mr-1" />
                        Enviar E-mail
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Decisores Executivos */}
              {Array.isArray(selectedCompany.decisores) && selectedCompany.decisores.length > 0 && (
                <div className="bg-seguranca-black p-4 rounded-lg border border-cyan-800/40 space-y-2">
                  <h4 className="text-xs font-bold text-cyan-400 uppercase flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4" />
                      Decisores Executivos & Operações
                    </span>
                    <Badge className="bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px]">
                      {selectedCompany.decisores.length} decisor(es)
                    </Badge>
                  </h4>
                  <div className="divide-y divide-gray-800">
                    {selectedCompany.decisores.map((d, idx) => (
                      <div key={idx} className="py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs gap-1">
                        <div>
                          <p className="font-semibold text-white">{d.nome}</p>
                          <p className="text-gray-400">{d.cargo}</p>
                        </div>
                        {d.email && (
                          <div className="flex items-center gap-2">
                            <span className="text-cyan-300 font-mono text-[11px]">{d.email}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopyEmail(d.email!)}
                              className="h-6 px-1.5 text-xs text-gray-400 hover:text-white"
                            >
                              {copiedEmail === d.email ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quadro de Sócios */}
              <div className="bg-seguranca-black p-4 rounded-lg border border-gray-700 space-y-2">
                <h4 className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4" />
                  Quadro de Sócios e Administradores (QSA)
                </h4>
                {Array.isArray(selectedCompany.qsa) && selectedCompany.qsa.length > 0 ? (
                  <div className="divide-y divide-gray-800">
                    {selectedCompany.qsa.map((s, idx) => (
                      <div key={idx} className="py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs gap-1">
                        <div>
                          <p className="font-semibold text-white">{s.nome}</p>
                          <p className="text-gray-400">{s.qualificacao}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {s.telefone && (
                            <button
                              type="button"
                              onClick={() => handleOpenWhatsApp(s.telefone!, selectedCompany, s.nome)}
                              className="flex items-center gap-1 text-[11px] text-green-400 hover:text-green-300 bg-green-950/40 px-2 py-0.5 rounded border border-green-800/50"
                            >
                              <Phone className="h-3 w-3" />
                              <span>{s.telefone}</span>
                            </button>
                          )}
                          {s.email && (
                            <div className="flex items-center gap-1 font-mono text-emerald-300 text-[11px]">
                              <span>{s.email}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCopyEmail(s.email!)}
                                className="h-6 px-1 text-xs text-gray-400 hover:text-white"
                              >
                                {copiedEmail === s.email ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                              </Button>
                            </div>
                          )}
                          {s.faixaEtaria && (
                            <Badge variant="outline" className="border-gray-700 text-gray-400">
                              {s.faixaEtaria}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Sem sócios listados.</p>
                )}
              </div>
            </div>

            <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2">
              {selectedCompany.telefone && (
                <Button
                  onClick={() => handleOpenWhatsApp(selectedCompany.telefone!, selectedCompany)}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Conversar no WhatsApp
                </Button>
              )}
              {selectedCompany.leadImported ? (
                <Button disabled className="bg-green-800 text-white">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Já Adicionado ao CRM
                </Button>
              ) : (
                <Button
                  onClick={() => handleSendToCrm(selectedCompany)}
                  className="bg-seguranca-yellow hover:bg-yellow-500 text-black font-bold"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Enviar Lead para o CRM
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Localização / Informação Manual de CNPJ */}
      <Dialog open={manualCnpjModalOpen} onOpenChange={setManualCnpjModalOpen}>
        <DialogContent className="max-w-md bg-seguranca-graphite border-gray-600 text-seguranca-lightgray">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-seguranca-yellow flex items-center gap-2">
              <Search className="h-5 w-5" />
              Localizar / Confirmar CNPJ
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-xs">
              Informe ou localize o CNPJ oficial para carregar os dados cadastrais, endereço e sócios na Receita Federal.
            </DialogDescription>
          </DialogHeader>

          {targetCompanyForCnpj && (
            <div className="space-y-4 text-sm mt-2">
              <div className="p-3 bg-seguranca-black/60 rounded-lg border border-gray-700">
                <span className="text-[11px] text-gray-400 block uppercase font-medium">Empresa / Estabelecimento</span>
                <p className="font-semibold text-white text-sm">
                  {targetCompanyForCnpj.nomeFantasia || targetCompanyForCnpj.razaoSocial}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {targetCompanyForCnpj.municipio} - {targetCompanyForCnpj.uf}
                  {targetCompanyForCnpj.bairro ? ` • Bairro: ${targetCompanyForCnpj.bairro}` : ''}
                </p>
              </div>

              {/* Atalho de Pesquisa Direta no Google / Redesim */}
              <div className="p-2.5 rounded bg-blue-950/30 border border-blue-900/50 flex items-center justify-between gap-2">
                <div className="text-xs text-gray-300">
                  <span className="font-medium text-blue-300 block">Dica Rápida:</span>
                  Consulte no Google / Redesim em 1 clique
                </div>
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(
                    `${targetCompanyForCnpj.nomeFantasia || targetCompanyForCnpj.razaoSocial} ${targetCompanyForCnpj.municipio || ''} ${targetCompanyForCnpj.uf || ''} CNPJ`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-seguranca-yellow hover:text-yellow-400 flex items-center gap-1 bg-seguranca-black px-2.5 py-1.5 rounded border border-gray-700 hover:border-seguranca-yellow shrink-0"
                >
                  <Search className="h-3 w-3" />
                  Abrir no Google
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>

              <form onSubmit={handleConfirmManualCnpj} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="manual-cnpj-input" className="text-xs font-medium text-gray-300">
                    Número do CNPJ (14 dígitos):
                  </Label>
                  <Input
                    id="manual-cnpj-input"
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={manualCnpjInput}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 14);
                      setManualCnpjInput(formatCNPJ(clean));
                    }}
                    autoFocus
                    className="bg-seguranca-black border-gray-600 text-white font-mono text-sm tracking-wide"
                  />
                  {manualCnpjInput && (
                    <div className="text-[11px] pt-0.5">
                      {validateCNPJ(manualCnpjInput) ? (
                        <span className="text-green-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Dígitos verificadores do CNPJ válidos
                        </span>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> CNPJ incompleto ou inválido
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <DialogFooter className="pt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setManualCnpjModalOpen(false);
                      setTargetCompanyForCnpj(null);
                    }}
                    className="text-gray-400 hover:text-white text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={searchingManualCnpj || !validateCNPJ(manualCnpjInput)}
                    className="bg-seguranca-yellow hover:bg-yellow-500 text-black font-bold text-xs"
                  >
                    {searchingManualCnpj ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        Consultando Receita...
                      </>
                    ) : (
                      <>
                        <Search className="h-3.5 w-3.5 mr-1.5" />
                        Consultar e Salvar
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Prospecto */}
      <Dialog open={editProspectModalOpen} onOpenChange={setEditProspectModalOpen}>
        <DialogContent className="max-w-xl bg-seguranca-graphite border-gray-600 text-seguranca-lightgray max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-seguranca-yellow flex items-center gap-2">
              <Edit className="h-5 w-5 text-amber-400" />
              Editar Informações do Prospecto
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-xs">
              Atualize a razão social, nome fantasia ou canais de contato reais antes de enviar ao CRM ou iniciar abordagem.
            </DialogDescription>
          </DialogHeader>

          {editingProspect && (
            <form onSubmit={handleSaveEditedProspect} className="space-y-4 text-xs mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-gray-300">Razão Social</Label>
                  <Input
                    value={editingProspect.razaoSocial || ''}
                    onChange={(e) => setEditingProspect({ ...editingProspect, razaoSocial: e.target.value })}
                    className="bg-seguranca-black border-gray-600 text-white text-xs h-9"
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-gray-300">Nome Fantasia</Label>
                  <Input
                    value={editingProspect.nomeFantasia || ''}
                    onChange={(e) => setEditingProspect({ ...editingProspect, nomeFantasia: e.target.value })}
                    placeholder="Nome comercial da empresa..."
                    className="bg-seguranca-black border-gray-600 text-white text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">CNPJ</Label>
                  <Input
                    value={editingProspect.cnpj || ''}
                    onChange={(e) => setEditingProspect({ ...editingProspect, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                    className="bg-seguranca-black border-gray-600 text-seguranca-yellow font-mono text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">Telefone / WhatsApp</Label>
                  <Input
                    value={editingProspect.telefone || ''}
                    onChange={(e) => setEditingProspect({ ...editingProspect, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="bg-seguranca-black border-gray-600 text-white text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-gray-300">E-mail Corporativo</Label>
                  <Input
                    type="email"
                    value={editingProspect.email || ''}
                    onChange={(e) => setEditingProspect({ ...editingProspect, email: e.target.value })}
                    placeholder="contato@empresa.com.br"
                    className="bg-seguranca-black border-gray-600 text-white text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">Cidade / Município</Label>
                  <Input
                    value={editingProspect.municipio || ''}
                    onChange={(e) => setEditingProspect({ ...editingProspect, municipio: e.target.value })}
                    className="bg-seguranca-black border-gray-600 text-white text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">Estado (UF)</Label>
                  <Input
                    value={editingProspect.uf || ''}
                    onChange={(e) => setEditingProspect({ ...editingProspect, uf: e.target.value.toUpperCase() })}
                    maxLength={2}
                    className="bg-seguranca-black border-gray-600 text-white text-xs h-9 uppercase"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-gray-300">Website Oficial</Label>
                  <Input
                    value={editingProspect.website || ''}
                    onChange={(e) => setEditingProspect({ ...editingProspect, website: e.target.value })}
                    placeholder="https://empresa.com.br"
                    className="bg-seguranca-black border-gray-600 text-white text-xs h-9"
                  />
                </div>
              </div>

              <DialogFooter className="pt-3 flex justify-end gap-2 border-t border-gray-700/60 mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditProspectModalOpen(false);
                    setEditingProspect(null);
                  }}
                  className="text-gray-400 hover:text-white text-xs h-9"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-seguranca-yellow hover:bg-yellow-500 text-black font-bold text-xs h-9 px-4"
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Configuração de Chaves de IA & Ferramentas */}
      <Dialog open={credentialsModalOpen} onOpenChange={setCredentialsModalOpen}>
        <DialogContent className="max-w-xl bg-seguranca-graphite border-gray-600 text-seguranca-lightgray max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-seguranca-yellow flex items-center gap-2">
              <Key className="h-5 w-5 text-amber-400" />
              Chaves & Ferramentas de Prospecção
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-xs">
              Configure as chaves dos motores de busca (Google Places, Apify Google Maps), enriquecimento (Apollo.io) e inteligência analítica (Gemini IA).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCredentials} className="space-y-4 text-sm mt-1">
            {/* Google Gemini AI */}
            <div className="space-y-1.5 p-3 rounded-lg bg-seguranca-black/60 border border-gray-700">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Google Gemini API Key
                </Label>
                {credentialsStatus?.geminiConfigured ? (
                  <Badge className="bg-green-950 text-green-300 border border-green-800 text-[10px]">
                    Ativo ({credentialsStatus.geminiMaskedKey})
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-400 border-gray-700 text-[10px]">
                    Não configurada
                  </Badge>
                )}
              </div>
              <Input
                type="password"
                placeholder="Cole sua chave da API do Google AI Studio..."
                value={geminiApiKeyInput}
                onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                className="bg-seguranca-black border-gray-600 text-white text-xs h-9"
              />
              <p className="text-[11px] text-gray-500">
                Obtenha gratuitamente no <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-seguranca-yellow underline">Google AI Studio</a>.
              </p>
            </div>

            {/* Google Places / Meu Negócio */}
            <div className="space-y-1.5 p-3 rounded-lg bg-seguranca-black/60 border border-gray-700">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-blue-400" />
                  Google Places API Key (Maps & Meu Negócio)
                </Label>
                {credentialsStatus?.googlePlacesConfigured ? (
                  <Badge className="bg-green-950 text-green-300 border border-green-800 text-[10px]">
                    Ativo ({credentialsStatus.googlePlacesMaskedKey})
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-400 border-gray-700 text-[10px]">
                    OpenStreetMap Ativo (Fallback)
                  </Badge>
                )}
              </div>
              <Input
                type="password"
                placeholder="Cole sua Google Cloud Places API Key (Opcional)..."
                value={googlePlacesApiKeyInput}
                onChange={(e) => setGooglePlacesApiKeyInput(e.target.value)}
                className="bg-seguranca-black border-gray-600 text-white text-xs h-9"
              />
              <p className="text-[11px] text-gray-500">
                Oferece busca nativa de alta precisão em empresas cadastradas no Google Meu Negócio.
              </p>
            </div>

            {/* Apify Google Maps Crawler */}
            <div className="space-y-1.5 p-3 rounded-lg bg-seguranca-black/60 border border-gray-700">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Compass className="h-4 w-4 text-emerald-400" />
                  Apify API Token (Raspagem Avançada no Google Maps)
                </Label>
                {credentialsStatus?.apifyConfigured ? (
                  <Badge className="bg-green-950 text-green-300 border border-green-800 text-[10px]">
                    Ativo ({credentialsStatus.apifyMaskedToken})
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-400 border-gray-700 text-[10px]">
                    Não configurado
                  </Badge>
                )}
              </div>
              <Input
                type="password"
                placeholder="Cole seu token pessoal do Apify (apify_api_...)"
                value={apifyTokenInput}
                onChange={(e) => setApifyTokenInput(e.target.value)}
                className="bg-seguranca-black border-gray-600 text-white text-xs h-9"
              />
              <p className="text-[11px] text-gray-500">
                Raspagem de alto volume e extração profunda de contatos via crawler <a href="https://apify.com" target="_blank" rel="noreferrer" className="text-seguranca-yellow underline">Apify.com</a>.
              </p>
            </div>

            {/* Apollo.io B2B Enrichment */}
            <div className="space-y-1.5 p-3 rounded-lg bg-seguranca-black/60 border border-gray-700">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-cyan-400" />
                  Apollo.io API Key (Enriquecimento de Decisores & E-mails)
                </Label>
                {credentialsStatus?.apolloConfigured ? (
                  <Badge className="bg-green-950 text-green-300 border border-green-800 text-[10px]">
                    Ativo ({credentialsStatus.apolloMaskedKey})
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-400 border-gray-700 text-[10px]">
                    Não configurada
                  </Badge>
                )}
              </div>
              <Input
                type="password"
                placeholder="Cole sua API Key do Apollo.io..."
                value={apolloApiKeyInput}
                onChange={(e) => setApolloApiKeyInput(e.target.value)}
                className="bg-seguranca-black border-gray-600 text-white text-xs h-9"
              />
              <p className="text-[11px] text-gray-500">
                Localiza automaticamente diretores, gerentes de facilities/compras e e-mails corporativos verificados via <a href="https://apollo.io" target="_blank" rel="noreferrer" className="text-seguranca-yellow underline">Apollo.io</a>.
              </p>
            </div>

            {/* CNPJá API (Receita Federal & QSA) */}
            <div className="space-y-1.5 p-3 rounded-lg bg-seguranca-black/60 border border-gray-700">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-seguranca-yellow" />
                  CNPJá API Key (Receita Federal, QSA & Contatos)
                </Label>
                {credentialsStatus?.cnpjaConfigured ? (
                  <Badge className="bg-green-950 text-green-300 border border-green-800 text-[10px]">
                    Comercial Ativa ({credentialsStatus.cnpjaMaskedKey})
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-[10px]">
                    Open CNPJá + BrasilAPI Ativas
                  </Badge>
                )}
              </div>
              <Input
                type="password"
                placeholder="Chave comercial da API CNPJá (Opcional - open.cnpja.com já ativo)..."
                value={cnpjaApiKeyInput}
                onChange={(e) => setCnpjaApiKeyInput(e.target.value)}
                className="bg-seguranca-black border-gray-600 text-white text-xs h-9"
              />
              <p className="text-[11px] text-gray-500">
                O sistema já utiliza gratuitamente <span className="text-emerald-400">open.cnpja.com</span> e <span className="text-emerald-400">BrasilAPI</span>. Informe uma chave comercial de <a href="https://cnpja.com" target="_blank" rel="noreferrer" className="text-seguranca-yellow underline">cnpja.com</a> apenas para consultas ilimitadas.
              </p>
            </div>

            {/* Modelo do Gemini */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-300">Modelo da IA</Label>
              <Select value={geminiModelInput} onValueChange={setGeminiModelInput}>
                <SelectTrigger className="bg-seguranca-black border-gray-600 text-white h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-black border-gray-700 text-white text-xs">
                  <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash (Ultra Rápido & Econômico - Recomendado)</SelectItem>
                  <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro (Maior raciocínio e profundidade)</SelectItem>
                  <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCredentialsModalOpen(false)}
                className="text-gray-400 hover:text-white text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingCredentials}
                className="bg-seguranca-yellow hover:bg-yellow-500 text-black font-bold text-xs"
              >
                {savingCredentials ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                Salvar Credenciais
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </StandardLayout>
  );
};

export default Prospeccao;
