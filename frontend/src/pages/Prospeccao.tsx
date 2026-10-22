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
  Save
} from 'lucide-react';
import prospectionService, { 
  ProspectCompany, 
  STRATEGIC_CNAES, 
  ESTADOS_BRASIL 
} from '@/services/prospectionService';
import { validateCNPJ, validateCPF, formatCNPJ } from '@/utils/validation';
import { useNavigate } from 'react-router-dom';

const Prospeccao: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Estados dos filtros
  const [activeTab, setActiveTab] = useState<'cnpj' | 'segmento' | 'maps'>('segmento');
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

  // Estados de ações
  const [sendingCrmId, setSendingCrmId] = useState<string | null>(null);
  const [sendingMarketingId, setSendingMarketingId] = useState<string | null>(null);

  // Estados de Configuração de Chaves/Tokens de IA e Ferramentas
  const [credentialsModalOpen, setCredentialsModalOpen] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [credentialsStatus, setCredentialsStatus] = useState<any>(null);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState('');
  const [googlePlacesApiKeyInput, setGooglePlacesApiKeyInput] = useState('');
  const [geminiModelInput, setGeminiModelInput] = useState('gemini-1.5-flash');

  // Carregar status das credenciais
  const loadCredentials = async () => {
    try {
      const data = await prospectionService.getCredentialsStatus();
      setCredentialsStatus(data);
      if (data.model) setGeminiModelInput(data.model);
    } catch (err) {
      console.warn('Não foi possível carregar o status das credenciais:', err);
    }
  };

  React.useEffect(() => {
    loadCredentials();
  }, []);

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingCredentials(true);
      await prospectionService.updateCredentials({
        geminiApiKey: geminiApiKeyInput,
        googlePlacesApiKey: googlePlacesApiKeyInput,
        model: geminiModelInput,
      });
      toast({
        title: 'Chaves atualizadas com sucesso!',
        description: 'As configurações de IA e Ferramentas de Prospecção estão ativas.',
      });
      setGeminiApiKeyInput('');
      setGooglePlacesApiKeyInput('');
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
      if (results.length > 0) {
        setProspects(results);
        toast({
          title: `🎯 ${results.length} empresas reais localizadas em ${cidade}!`,
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
      setProspects(prev => {
        const filtered = prev.filter(p => p.cnpj !== company.cnpj);
        return [company, ...filtered];
      });
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

  // Enviar para o CRM (Kanban)
  const handleSendToCrm = async (company: ProspectCompany) => {
    try {
      setSendingCrmId(company.cnpj);
      const lead = await prospectionService.sendToCrm(company);
      
      setProspects(prev => prev.map(p => p.cnpj === company.cnpj ? { ...p, leadImported: true, importedLeadId: lead.id } : p));
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
  const handleOpenWhatsApp = (phone: string, company: ProspectCompany) => {
    const link = prospectionService.getWhatsAppLink(phone, company);
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
            title="Configurar chaves de API da IA Gemini e Google Places / Meu Negócio"
          >
            <Key className="h-4 w-4 text-amber-400" />
            Chaves & IA
            {credentialsStatus?.geminiConfigured && (
              <span className="h-2 w-2 rounded-full bg-green-500 inline-block ml-0.5" title="Gemini Ativo" />
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
            <TabsList className="bg-seguranca-black border border-gray-700 p-1 mb-6">
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
          </Tabs>
        </CardContent>
      </Card>

      {/* Resultados da Prospecção */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-seguranca-yellow" />
            Leads e Empresas Encontradas ({prospects.length})
          </h2>
          {prospects.length > 0 && (
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

        {prospects.length === 0 ? (
          <div className="bg-seguranca-graphite/40 border border-dashed border-gray-700 rounded-lg p-12 text-center space-y-3">
            <Building2 className="h-12 w-12 text-gray-600 mx-auto" />
            <h3 className="text-base font-semibold text-gray-300">Nenhum prospecto carregado no momento</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Utilize o campo de busca acima para digitar um CNPJ ou buscar por segmento e região. Os resultados serão enriquecidos com sócios e canais de contato.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {prospects.map((company) => {
              const decisorPrincipal = company.qsa.length > 0 ? company.qsa[0] : null;

              return (
                <Card 
                  key={company.cnpj} 
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
                        className={company.situacaoCadastral === 'ATIVA' ? 'border-green-500 text-green-400 shrink-0' : 'border-amber-500 text-amber-400 shrink-0'}
                      >
                        {company.situacaoCadastral}
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

                    {/* Sócios / Tomadores de Decisão */}
                    <div className="flex items-start gap-2 text-gray-300 bg-seguranca-black/40 p-2.5 rounded border border-gray-700/50">
                      <UserCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="w-full">
                        <span className="text-xs font-semibold text-emerald-400 block mb-0.5">
                          Tomador(es) de Decisão (QSA):
                        </span>
                        {company.qsa.length > 0 ? (
                          <div className="space-y-1">
                            {company.qsa.slice(0, 2).map((s, idx) => (
                              <p key={idx} className="text-xs text-white">
                                • <strong>{s.nome}</strong> <span className="text-gray-400">({s.qualificacao})</span>
                              </p>
                            ))}
                            {company.qsa.length > 2 && (
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

                      {!company.cnpj && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCompany(company);
                            setDetailsModalOpen(true);
                          }}
                          className="border-seguranca-yellow text-seguranca-yellow hover:bg-seguranca-yellow hover:text-black h-8 px-2.5 text-xs font-medium"
                          title="Consultar CNPJ na Receita Federal para enriquecer dados oficiais"
                        >
                          <Search className="h-3.5 w-3.5 mr-1" />
                          Buscar CNPJ
                        </Button>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedCompany(company);
                          setDetailsModalOpen(true);
                        }}
                        className="text-gray-300 hover:text-white h-8 px-2.5 text-xs"
                      >
                        Ver Detalhes
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
                            if (!company.cnpj || !validateCNPJ(company.cnpj)) {
                              setSelectedCompany(company);
                              setDetailsModalOpen(true);
                              toast({
                                title: 'CNPJ obrigatório para CRM',
                                description: 'Por favor, consulte ou informe um CNPJ real e válido da empresa antes de enviar para o CRM.',
                                variant: 'destructive',
                              });
                              return;
                            }
                            handleSendToCrm(company);
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
                          const userCnpj = prompt(`Informe o CNPJ oficial de "${selectedCompany.nomeFantasia || selectedCompany.razaoSocial}":`);
                          if (userCnpj) {
                            if (!validateCNPJ(userCnpj)) {
                              toast({
                                title: 'CNPJ inválido',
                                description: 'O CNPJ informado não possui formato ou dígitos verificadores válidos.',
                                variant: 'destructive',
                              });
                              return;
                            }
                            handleSearchCnpj(undefined, userCnpj);
                            setDetailsModalOpen(false);
                          }
                        }}
                      >
                        Digitar e Consultar Receita
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

              {/* Quadro de Sócios */}
              <div className="bg-seguranca-black p-4 rounded-lg border border-gray-700 space-y-2">
                <h4 className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4" />
                  Quadro de Sócios e Administradores (QSA)
                </h4>
                {selectedCompany.qsa.length > 0 ? (
                  <div className="divide-y divide-gray-800">
                    {selectedCompany.qsa.map((s, idx) => (
                      <div key={idx} className="py-2 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-semibold text-white">{s.nome}</p>
                          <p className="text-gray-400">{s.qualificacao}</p>
                        </div>
                        {s.faixaEtaria && (
                          <Badge variant="outline" className="border-gray-700 text-gray-400">
                            {s.faixaEtaria}
                          </Badge>
                        )}
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

      {/* Modal de Configuração de Chaves de IA & Ferramentas */}
      <Dialog open={credentialsModalOpen} onOpenChange={setCredentialsModalOpen}>
        <DialogContent className="max-w-lg bg-seguranca-graphite border-gray-600 text-seguranca-lightgray">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-seguranca-yellow flex items-center gap-2">
              <Key className="h-5 w-5 text-amber-400" />
              Chaves & Tokens de Prospecção
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-xs">
              Informe as chaves das ferramentas para ativar raspagem inteligente e qualificação com IA.
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
                Opcional. Se não informada, o sistema utiliza o motor geoespacial livre do OpenStreetMap Nominatim.
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
