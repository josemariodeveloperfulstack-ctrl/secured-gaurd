import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Save, Eye, Loader2, Building2, FileText, RotateCcw, ScrollText, ChevronDown, ChevronUp } from 'lucide-react';
import { companyConfigService, CompanyConfig, ContractTemplatePreviewRequest } from '@/services/companyConfigService';
import { companyService } from '@/services/companyService';
import {
  companyContractTemplateService,
  templateClausesToList,
  CONTRACT_TEMPLATE_LABELS,
  CLAUSE_TITLES,
  CompanyContractTemplate,
  ContractTemplateKey,
  getAllowedTemplateKeysForCompany,
} from '@/services/companyContractTemplateService';
import { getApiUrl } from '@/config/environment';
import { resolveCompanyLogoUrl } from '@/utils/companyLogo';

interface CompanySettingsProps {
  open: boolean;
  onSave: (config: CompanyConfig) => void;
}

const DEFAULT_HEADER = 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE SEGURANÇA';
const DEFAULT_FOOTER = 'Este contrato é regido pelas leis brasileiras e foro da cidade de Contagem/MG.';
const DEFAULT_TERMS = `CLÁUSULAS E CONDIÇÕES:

1. DO OBJETO: A CONTRATADA prestará serviços de segurança patrimonial conforme especificado neste contrato.

2. DAS OBRIGAÇÕES DA CONTRATADA:
   - Fornecer pessoal qualificado e treinado
   - Manter equipamentos em perfeito estado
   - Cumprir horários estabelecidos
   - Reportar ocorrências imediatamente

3. DAS OBRIGAÇÕES DA CONTRATANTE:
   - Efetuar pagamentos conforme prazo estabelecido
   - Fornecer acesso às dependências necessárias
   - Comunicar alterações com antecedência

4. DO VALOR E PAGAMENTO:
   - O valor será pago mensalmente até o dia 10
   - Reajustes conforme índices oficiais
   - Multa de 2% em caso de atraso

5. DA VIGÊNCIA:
   - Conforme período estabelecido no contrato
   - Renovação automática salvo manifestação contrária

6. DA RESCISÃO:
   - Comunicação prévia de 30 dias
   - Pagamento proporcional dos serviços prestados

7. DO FORO:
   - Foro da comarca de Contagem/MG para questões judiciais`;

function buildDefaultsFromCompany(company: any): CompanyConfig {
  const address = [company.address, company.enderecoRua, company.city, company.state, company.zipCode]
    .filter(Boolean)
    .join(', ');
  return {
    companyId: company.id,
    name: company.name || '',
    cnpj: company.cnpj || '',
    address: address || '',
    city: company.city || '',
    state: company.state || '',
    zipCode: company.zipCode || '',
    phone: company.phone || '',
    email: company.email || '',
    website: company.website || '',
    logoUrl: company.logoUrl || '',
    headerText: DEFAULT_HEADER,
    footerText: DEFAULT_FOOTER,
    contractTerms: DEFAULT_TERMS,
  };
}

export const CompanySettings: React.FC<CompanySettingsProps> = ({ open, onSave }) => {
  const { toast } = useToast();
  const [companiesList, setCompaniesList] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [config, setConfig] = useState<CompanyConfig>({
    name: '',
    cnpj: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    website: '',
    logoUrl: '',
    headerText: DEFAULT_HEADER,
    footerText: DEFAULT_FOOTER,
    contractTerms: '',
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // ===== Templates de contrato (14 cláusulas) =====
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templates, setTemplates] = useState<Record<ContractTemplateKey, CompanyContractTemplate | null>>({
    ARMADA: null,
    DESARMADA: null,
    PORTARIA: null,
  });
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<ContractTemplateKey>('ARMADA');
  const [clauses, setClauses] = useState<(string | undefined)[]>(Array(14).fill(undefined));
  const [templateTitle, setTemplateTitle] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [previewTemplateLoading, setPreviewTemplateLoading] = useState(false);
  const [expandedClauses, setExpandedClauses] = useState<Set<number>>(new Set());

  const TEMPLATE_KEYS: ContractTemplateKey[] = ['ARMADA', 'DESARMADA', 'PORTARIA'];

  const applyTemplateToForm = useCallback((tpl: CompanyContractTemplate | null) => {
    setClauses(templateClausesToList(tpl));
    setTemplateTitle(tpl?.title || '');
  }, []);

  const loadTemplates = useCallback(
    async (companyId: string, companyObj?: { id?: string; sigla?: string; name?: string } | null) => {
      setTemplatesLoading(true);
      try {
        const comp = companyObj || companiesList.find((c: any) => c.id === companyId);
        const allowed = getAllowedTemplateKeysForCompany(comp);

        const list = await companyContractTemplateService.listForCompany(companyId);
        const map: Record<ContractTemplateKey, CompanyContractTemplate | null> = {
          ARMADA: null,
          DESARMADA: null,
          PORTARIA: null,
        };
        for (const tpl of list) {
          const key = (tpl.templateKey || '').toUpperCase() as ContractTemplateKey;
          if (key in map) map[key] = tpl;
        }
        setTemplates(map);

        setSelectedTemplateKey((prevKey) => {
          const validKey = allowed.includes(prevKey) ? prevKey : allowed[0];
          const current = map[validKey] || (allowed[0] ? map[allowed[0]] : null);
          applyTemplateToForm(current);
          return validKey;
        });
      } catch (error) {
        console.error('Erro ao carregar templates de contrato:', error);
      } finally {
        setTemplatesLoading(false);
      }
    },
    [applyTemplateToForm, companiesList]
  );

  const handleSelectTemplate = (key: ContractTemplateKey) => {
    setSelectedTemplateKey(key);
    applyTemplateToForm(templates[key]);
  };

  const handleClauseChange = (index: number, value: string) => {
    setClauses((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const toggleClauseExpanded = (index: number) => {
    setExpandedClauses((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const buildTemplatePayload = (): CompanyContractTemplate => {
    const base = templates[selectedTemplateKey];
    const values = [
      clauses[0], clauses[1], clauses[2], clauses[3], clauses[4], clauses[5], clauses[6],
      clauses[7], clauses[8], clauses[9], clauses[10], clauses[11], clauses[12], clauses[13],
    ];
    return {
      ...(base || {}),
      companyId: selectedCompanyId || null,
      templateKey: selectedTemplateKey,
      title: templateTitle,
      clause1: values[0] ?? '',
      clause2: values[1] ?? '',
      clause3: values[2] ?? '',
      clause4: values[3] ?? '',
      clause5: values[4] ?? '',
      clause6: values[5] ?? '',
      clause7: values[6] ?? '',
      clause8: values[7] ?? '',
      clause9: values[8] ?? '',
      clause10: values[9] ?? '',
      clause11: values[10] ?? '',
      clause12: values[11] ?? '',
      clause13: values[12] ?? '',
      clause14: values[13] ?? '',
    };
  };

  const handleSaveTemplate = async () => {
    if (!selectedCompanyId) {
      toast({
        title: 'Empresa não selecionada',
        description: 'Selecione a aba de uma empresa cadastrada.',
        variant: 'destructive',
      });
      return;
    }
    setSavingTemplate(true);
    try {
      const saved = await companyContractTemplateService.saveForCompany(
        selectedCompanyId,
        buildTemplatePayload()
      );
      setTemplates((prev) => ({ ...prev, [selectedTemplateKey]: saved }));
      applyTemplateToForm(saved);
      toast({
        title: 'Template Salvo',
        description: `As 14 cláusulas do modelo ${CONTRACT_TEMPLATE_LABELS[selectedTemplateKey]} foram salvas para esta empresa.`,
      });
    } catch (error: any) {
      console.error('Erro ao salvar template:', error);
      toast({
        title: 'Erro ao Salvar',
        description: error.message || 'Não foi possível salvar o template do contrato.',
        variant: 'destructive',
      });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleResetTemplate = async () => {
    if (!selectedCompanyId) return;
    if (!confirm(`Restaurar as 14 cláusulas do modelo ${CONTRACT_TEMPLATE_LABELS[selectedTemplateKey]} para o texto oficial? As edições desta empresa serão perdidas.`)) {
      return;
    }
    try {
      const restored = await companyContractTemplateService.resetForCompany(selectedCompanyId, selectedTemplateKey);
      setTemplates((prev) => ({ ...prev, [selectedTemplateKey]: restored }));
      applyTemplateToForm(restored);
      toast({
        title: 'Template Restaurado',
        description: 'O texto oficial do modelo foi restaurado.',
      });
    } catch (error: any) {
      console.error('Erro ao restaurar template:', error);
      toast({
        title: 'Erro ao Restaurar',
        description: error.message || 'Não foi possível restaurar o texto oficial.',
        variant: 'destructive',
      });
    }
  };

  const handlePreviewTemplate = async () => {
    if (!selectedCompanyId) return;
    setPreviewTemplateLoading(true);
    try {
      const request = {
        companyId: selectedCompanyId,
        contractTemplateKey: selectedTemplateKey,
        clauses: clauses.map((c) => c ?? ''),
      };
      const blob = await companyConfigService.generatePreviewPdf(request as any);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error: any) {
      console.error('Erro ao gerar preview da minuta:', error);
      toast({
        title: 'Erro ao gerar preview',
        description: error.message || 'Não foi possível gerar o PDF da minuta.',
        variant: 'destructive',
      });
    } finally {
      setPreviewTemplateLoading(false);
    }
  };

  const loadConfigForCompany = useCallback(async (companyId: string, companies: any[]) => {
    const company = companies.find((c: any) => c.id === companyId);
    if (!company) return;

    const existing = await companyConfigService.getConfigByCompanyId(companyId);
    if (existing) {
      setConfig({
        ...existing,
        companyId,
        name: company.name || existing.name || '',
        cnpj: company.cnpj || existing.cnpj || '',
        phone: company.phone || existing.phone || '',
        email: company.email || existing.email || '',
        logoUrl: company.logoUrl || existing.logoUrl || '',
        headerText: existing.headerText || DEFAULT_HEADER,
        footerText: existing.footerText || DEFAULT_FOOTER,
        contractTerms: existing.contractTerms || DEFAULT_TERMS,
      });
    } else {
      setConfig(buildDefaultsFromCompany(company));
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadAll();
    }
  }, [open]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const companies = await companyService.getAllCompanies();
      const actualCompanies = Array.isArray(companies) ? companies : [];
      setCompaniesList(actualCompanies);

      if (actualCompanies.length === 0) {
        setSelectedCompanyId('');
        return;
      }

      let companyIdToSet = selectedCompanyId;
      if (!companyIdToSet || !actualCompanies.some((c: any) => c.id === companyIdToSet)) {
        const activeConfig = await companyConfigService.getActiveConfig();
        if (activeConfig?.companyId && actualCompanies.some((c: any) => c.id === activeConfig.companyId)) {
          companyIdToSet = activeConfig.companyId;
        } else {
          companyIdToSet = actualCompanies[0].id;
        }
      }

      setSelectedCompanyId(companyIdToSet);
      await loadConfigForCompany(companyIdToSet, actualCompanies);
      const targetCompany = actualCompanies.find((c: any) => c.id === companyIdToSet);
      void loadTemplates(companyIdToSet, targetCompany);
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações da empresa.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = async (companyId: string) => {
    if (!companyId || companyId === selectedCompanyId) return;
    setSelectedCompanyId(companyId);
    setLoading(true);
    try {
      await loadConfigForCompany(companyId, companiesList);
      const targetCompany = companiesList.find((c: any) => c.id === companyId);
      void loadTemplates(companyId, targetCompany);
    } catch (error) {
      console.error('Erro ao carregar aba da empresa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o layout desta empresa.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getLogoDisplayUrl = (logoUrl: string | undefined): string | null => {
    return resolveCompanyLogoUrl(logoUrl);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!selectedCompanyId) {
        toast({
          title: 'Empresa não selecionada',
          description: 'Selecione a aba de uma empresa cadastrada.',
          variant: 'destructive',
        });
        return;
      }

      const configToSave = { ...config, companyId: selectedCompanyId };
      const savedConfig = await companyConfigService.saveConfig(configToSave);
      setConfig(savedConfig);
      onSave(savedConfig);

      toast({
        title: 'Configurações Salvas',
        description: `Layout e contrato de "${savedConfig.name || 'empresa'}" salvos com sucesso.`,
      });
    } catch (error: any) {
      console.error('Erro ao salvar configuração:', error);
      toast({
        title: 'Erro ao Salvar',
        description: error.message || 'Não foi possível salvar as configurações da empresa.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedCompanyId) {
      toast({
        title: 'Empresa não selecionada',
        description: 'Selecione a aba de uma empresa antes de visualizar o preview.',
        variant: 'destructive',
      });
      return;
    }
    setPreviewLoading(true);
    try {
      const request: ContractTemplatePreviewRequest = {
        companyId: selectedCompanyId,
        headerText: config.headerText,
        footerText: config.footerText,
        contractTerms: config.contractTerms,
      };
      const blob = await companyConfigService.generatePreviewPdf(request);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error: any) {
      console.error('Erro ao gerar preview PDF:', error);
      toast({
        title: 'Erro ao gerar preview',
        description: error.message || 'Não foi possível gerar o PDF do template.',
        variant: 'destructive',
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const currentCompany = companiesList.find((c: any) => c.id === selectedCompanyId);
  const allowedTemplateKeys = getAllowedTemplateKeysForCompany(currentCompany);
  const isVigCompany = allowedTemplateKeys.includes('ARMADA');

  if (!open) return null;

  return (
    <div className="space-y-6">
      {companiesList.length === 0 ? (
        <Card className="bg-seguranca-graphite border-gray-600">
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhuma empresa cadastrada. Cadastre empresas em Cadastros → Empresas.
          </CardContent>
        </Card>
      ) : (
        <Tabs value={selectedCompanyId} onValueChange={handleTabChange} className="w-full">
          <div className="overflow-x-auto pb-1">
            <TabsList className="inline-flex h-auto min-w-full w-max gap-1 bg-seguranca-black border border-gray-600 p-1">
              {companiesList.map((c: any) => (
                <TabsTrigger
                  key={c.id}
                  value={c.id}
                  className="text-seguranca-lightgray data-[state=active]:bg-seguranca-yellow data-[state=active]:text-black whitespace-nowrap px-3 py-2"
                >
                  <Building2 className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                  <span className="truncate max-w-[180px]" title={c.name}>
                    {c.sigla || c.name || 'Empresa'}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {companiesList.map((c: any) => (
            <TabsContent key={c.id} value={c.id} className="mt-4 space-y-6">
              <Card className="bg-seguranca-graphite border-gray-600">
                <CardHeader>
                  <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
                    <Building2 size={18} />
                    Layout e dados — {c.name}
                  </CardTitle>
                  <p className="text-sm text-gray-400 mt-1">
                    Cada empresa tem layout, cabeçalho, rodapé e cláusulas próprios. Os dados cadastrais vêm da tabela Companies.
                  </p>
                </CardHeader>
                <CardContent>
                  {loading && selectedCompanyId === c.id ? (
                    <div className="flex items-center gap-2 text-muted-foreground py-6">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando configurações...
                    </div>
                  ) : selectedCompanyId === c.id && config.name ? (
                    <div className="p-4 bg-seguranca-black rounded-lg border border-gray-600">
                      <div className="flex items-start gap-4">
                        {config.logoUrl && (() => {
                          const logoDisplayUrl = getLogoDisplayUrl(config.logoUrl);
                          return logoDisplayUrl ? (
                            <img src={logoDisplayUrl} alt="Logo" className="max-h-16 object-contain" />
                          ) : null;
                        })()}
                        <div>
                          <p className="text-seguranca-lightgray font-medium">{config.name}</p>
                          {config.cnpj && <p className="text-gray-300 text-sm">CNPJ: {config.cnpj}</p>}
                          {config.address && <p className="text-gray-300 text-sm">Endereço: {config.address}</p>}
                          {(config.phone || config.email) && (
                            <p className="text-gray-300 text-sm">
                              Tel: {config.phone || '-'} | Email: {config.email || '-'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {selectedCompanyId === c.id && (
                <Card className="bg-seguranca-graphite border-gray-600">
                  <CardHeader>
                    <CardTitle className="text-seguranca-lightgray">Template do Contrato desta empresa</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-seguranca-lightgray">Título do Cabeçalho</Label>
                      <Input
                        value={config.headerText}
                        onChange={(e) => setConfig((prev) => ({ ...prev, headerText: e.target.value }))}
                        className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <Label className="text-seguranca-lightgray">Texto do Rodapé</Label>
                      <Textarea
                        value={config.footerText}
                        onChange={(e) => setConfig((prev) => ({ ...prev, footerText: e.target.value }))}
                        className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                        rows={2}
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <Label className="text-seguranca-lightgray">Cláusulas e Condições do Contrato</Label>
                      <Textarea
                        value={config.contractTerms}
                        onChange={(e) => setConfig((prev) => ({ ...prev, contractTerms: e.target.value }))}
                        className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                        rows={15}
                        disabled={loading}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ===== Minutas de Contrato (14 Cláusulas) ===== */}
              {selectedCompanyId === c.id && (
                <Card className="bg-seguranca-graphite border-gray-600">
                  <CardHeader>
                    <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
                      <ScrollText size={18} />
                      Minutas de Contrato — 14 Cláusulas ({c.sigla || c.name})
                    </CardTitle>
                    <p className="text-sm text-gray-400 mt-1">
                      {isVigCompany
                        ? 'Edite as 14 cláusulas dos modelos de Vigilância (Armada e Desarmada). Ao salvar, a empresa passa a usar suas próprias cláusulas na geração dos contratos.'
                        : 'Edite as 14 cláusulas do modelo de Portaria e Controle de Acesso. Ao salvar, a empresa passa a usar suas próprias cláusulas na geração dos contratos.'}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Seleção do modelo */}
                    <div className="flex flex-wrap gap-2">
                      {allowedTemplateKeys.map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleSelectTemplate(key)}
                          className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                            selectedTemplateKey === key
                              ? 'bg-seguranca-yellow text-black border-seguranca-yellow'
                              : 'bg-seguranca-black text-seguranca-lightgray border-gray-600 hover:border-seguranca-yellow/50'
                          }`}
                        >
                          <FileText className="h-3.5 w-3.5 mr-1.5 inline" />
                          {CONTRACT_TEMPLATE_LABELS[key]}
                          {templates[key] && !templates[key]?.companyId && (
                            <span className="ml-1.5 text-[10px] text-gray-500">(oficial)</span>
                          )}
                        </button>
                      ))}
                    </div>

                    {templatesLoading ? (
                      <div className="flex items-center gap-2 text-muted-foreground py-6">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando minutas...
                      </div>
                    ) : (
                      <>
                        <div>
                          <Label className="text-seguranca-lightgray">Título do Contrato</Label>
                          <Input
                            value={templateTitle}
                            onChange={(e) => setTemplateTitle(e.target.value)}
                            className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                          />
                        </div>

                        {/* 14 cláusulas recolhíveis */}
                        <div className="space-y-2">
                          {CLAUSE_TITLES.map((title, index) => {
                            const isExpanded = expandedClauses.has(index);
                            const value = clauses[index] ?? '';
                            return (
                              <div
                                key={index}
                                className="border border-gray-600 rounded-lg bg-seguranca-black overflow-hidden"
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleClauseExpanded(index)}
                                  className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-800/50"
                                >
                                  <span className="text-sm text-seguranca-lightgray font-medium">
                                    {title}
                                    <span className="ml-2 text-xs text-gray-500 font-normal">
                                      ({value.length} caracteres)
                                    </span>
                                  </span>
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                                  )}
                                </button>
                                {isExpanded && (
                                  <div className="px-3 pb-3">
                                    <Textarea
                                      value={value}
                                      onChange={(e) => handleClauseChange(index, e.target.value)}
                                      className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray text-sm"
                                      rows={12}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-gray-600">
                          <Button
                            onClick={handlePreviewTemplate}
                            disabled={previewTemplateLoading || !selectedCompanyId}
                            variant="outline"
                            size="sm"
                            className="border-seguranca-yellow text-seguranca-yellow hover:bg-seguranca-yellow hover:text-black"
                          >
                            {previewTemplateLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Gerando PDF...
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-2" />
                                Preview da Minuta
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={handleResetTemplate}
                            variant="outline"
                            size="sm"
                            className="border-gray-600 text-gray-300 hover:bg-gray-800"
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Restaurar Oficial
                          </Button>
                          <Button
                            onClick={handleSaveTemplate}
                            disabled={savingTemplate || !selectedCompanyId}
                            className="bg-seguranca-red hover:bg-seguranca-darkred text-white"
                            size="sm"
                          >
                            {savingTemplate ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Salvando...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                Salvar Cláusulas desta Empresa
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      <div className="flex justify-between">
        <Button
          onClick={handlePreview}
          disabled={previewLoading || !selectedCompanyId || loading}
          variant="outline"
          className="border-seguranca-yellow text-seguranca-yellow hover:bg-seguranca-yellow hover:text-black"
        >
          {previewLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Gerando PDF...
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Preview Template
            </>
          )}
        </Button>

        <Button
          onClick={handleSave}
          disabled={saving || loading || !selectedCompanyId}
          className="bg-seguranca-red hover:bg-seguranca-darkred text-white"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Configurações desta Empresa
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
