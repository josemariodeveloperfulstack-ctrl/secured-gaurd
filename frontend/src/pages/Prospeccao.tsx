import React, { useState } from 'react';
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
  Briefcase
} from 'lucide-react';
import prospectionService, { 
  ProspectCompany, 
  STRATEGIC_CNAES, 
  ESTADOS_BRASIL 
} from '@/services/prospectionService';
import { useNavigate } from 'react-router-dom';

const Prospeccao: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Estados dos filtros
  const [activeTab, setActiveTab] = useState<'cnpj' | 'segmento' | 'maps'>('cnpj');
  const [cnpjInput, setCnpjInput] = useState('');
  const [selectedCnae, setSelectedCnae] = useState(STRATEGIC_CNAES[0].codigo);
  const [selectedUf, setSelectedUf] = useState('SP');
  const [municipioInput, setMunicipioInput] = useState('');
  const [mapsKeyword, setMapsKeyword] = useState('');

  // Estados de dados e execução
  const [loading, setLoading] = useState(false);
  const [prospects, setProspects] = useState<ProspectCompany[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<ProspectCompany | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Estados de ações
  const [sendingCrmId, setSendingCrmId] = useState<string | null>(null);
  const [sendingMarketingId, setSendingMarketingId] = useState<string | null>(null);

  // Busca por CNPJ
  const handleSearchCnpj = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cnpjInput.trim()) {
      toast({
        title: 'Informe o CNPJ',
        description: 'Digite um CNPJ válido com 14 números.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const company = await prospectionService.searchByCnpj(cnpjInput);
      setProspects([company]);
      toast({
        title: 'Empresa localizada com sucesso!',
        description: `${company.razaoSocial} carregada com dados completos e sócios.`,
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

  // Busca Segmentada / CNAE
  const handleSearchSegmento = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      const results = await prospectionService.searchByCnaeAndRegion(selectedCnae, selectedUf, municipioInput);
      if (results.length > 0) {
        setProspects(results);
      } else {
        toast({
          title: 'Dica de Prospecção',
          description: 'Para listar por segmento em lote, você também pode consultar CNPJs específicos da região ou buscar no Google Maps.',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Erro na busca segmentada',
        description: err.message || 'Falha ao buscar empresas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Busca no Google Maps / Places
  const handleSearchMaps = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!mapsKeyword.trim() && !municipioInput.trim()) {
      toast({
        title: 'Termo de pesquisa obrigatório',
        description: 'Digite o tipo de negócio ou bairro que deseja prospectar.',
        variant: 'destructive',
      });
      return;
    }

    const query = encodeURIComponent(`${mapsKeyword || 'empresas condomínios'} ${municipioInput} ${selectedUf}`);
    window.open(`https://www.google.com/maps/search/${query}`, '_blank');
    toast({
      title: 'Google Maps aberto para Prospecção',
      description: 'Copie os CNPJs ou nomes encontrados para enriquecer instantaneamente na aba CNPJ.',
    });
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
                value="cnpj" 
                className="data-[state=active]:bg-seguranca-yellow data-[state=active]:text-black text-xs sm:text-sm font-medium"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Busca Rápida por CNPJ
              </TabsTrigger>
              <TabsTrigger 
                value="segmento" 
                className="data-[state=active]:bg-seguranca-yellow data-[state=active]:text-black text-xs sm:text-sm font-medium"
              >
                <Briefcase className="h-4 w-4 mr-2" />
                CNAE & Região
              </TabsTrigger>
              <TabsTrigger 
                value="maps" 
                className="data-[state=active]:bg-seguranca-yellow data-[state=active]:text-black text-xs sm:text-sm font-medium"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Google Maps / Região Local
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: CNPJ DIRETO */}
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
                💡 Retorna Razão Social, Sócios/Decisores (QSA), Telefones com WhatsApp, E-mail, Endereço completo e CNAE.
              </p>
            </TabsContent>

            {/* ABA 2: CNAE & REGIÃO */}
            <TabsContent value="segmento" className="space-y-4">
              <form onSubmit={handleSearchSegmento} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-300">Segmento / CNAE Alvo</Label>
                  <Select value={selectedCnae} onValueChange={setSelectedCnae}>
                    <SelectTrigger className="bg-seguranca-black border-gray-600 text-white h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-black border-gray-700 text-white max-h-72">
                      {STRATEGIC_CNAES.map((c) => (
                        <SelectItem key={c.codigo} value={c.codigo}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-300">Estado (UF)</Label>
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
                  <Label className="text-xs text-gray-300">Cidade (Opcional)</Label>
                  <Input
                    placeholder="Ex: São Paulo, Campinas..."
                    value={municipioInput}
                    onChange={(e) => setMunicipioInput(e.target.value)}
                    className="bg-seguranca-black border-gray-600 text-white h-10"
                  />
                </div>

                <div className="md:col-span-3 flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="bg-seguranca-yellow hover:bg-yellow-500 text-black font-bold h-10 px-6"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                    Pesquisar Empresas no Segmento
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* ABA 3: GOOGLE MAPS / REGIONAL */}
            <TabsContent value="maps" className="space-y-4">
              <form onSubmit={handleSearchMaps} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs text-gray-300">Palavra-chave ou Nicho</Label>
                  <Input
                    placeholder="Ex: Condomínio Edifício, Indústria, Hospital, Centro Logístico..."
                    value={mapsKeyword}
                    onChange={(e) => setMapsKeyword(e.target.value)}
                    className="bg-seguranca-black border-gray-600 text-white h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-300">Cidade / Bairro</Label>
                  <Input
                    placeholder="Ex: Jardins, Barueri, Santos..."
                    value={municipioInput}
                    onChange={(e) => setMunicipioInput(e.target.value)}
                    className="bg-seguranca-black border-gray-600 text-white h-10"
                  />
                </div>
                <div className="md:col-span-3 flex justify-end">
                  <Button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-10 px-6"
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    Abrir no Google Maps para Radar
                  </Button>
                </div>
              </form>
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
                        <Badge className="bg-seguranca-yellow text-black font-bold text-[10px] mb-1">
                          CNPJ: {company.cnpj}
                        </Badge>
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
                        className={company.situacaoCadastral === 'ATIVA' ? 'border-green-500 text-green-400' : 'border-amber-500 text-amber-400'}
                      >
                        {company.situacaoCadastral}
                      </Badge>
                    </div>
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
                      ) : (
                        <div className="text-xs text-gray-500 italic">E-mail não listado</div>
                      )}
                    </div>
                  </CardContent>

                  {/* Barra de Ações Rápidas */}
                  <div className="p-3 bg-seguranca-black border-t border-gray-700 rounded-b-lg flex flex-wrap gap-2 items-center justify-between">
                    <div className="flex gap-2">
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
                          onClick={() => handleSendToCrm(company)}
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
                  <span className="font-semibold text-seguranca-yellow">{selectedCompany.cnpj}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Situação Cadastral:</span>
                  <Badge className="bg-green-600 text-white mt-1">{selectedCompany.situacaoCadastral}</Badge>
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
    </div>
  );
};

export default Prospeccao;
