import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Save, Eye, Loader2, Building2 } from 'lucide-react';
import { companyConfigService, CompanyConfig, ContractTemplatePreviewRequest } from '@/services/companyConfigService';
import { companyService } from '@/services/companyService';
import { getApiUrl } from '@/config/environment';

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
    if (!logoUrl) return null;
    const baseUrl = getApiUrl().replace('/api', '');
    const trimmed = logoUrl.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('/api/uploads/')) return `${baseUrl}${trimmed}`;
    if (trimmed.startsWith('api/uploads/')) return `${baseUrl}/${trimmed}`;
    if (trimmed.startsWith('/uploads/')) return `${baseUrl}/api${trimmed}`;
    if (trimmed.startsWith('uploads/')) return `${baseUrl}/api/${trimmed}`;
    const filename = trimmed.replace(/^\/+/, '').replace(/^api\/uploads\/companies\/logos\//, '');
    return `${baseUrl}/api/uploads/companies/logos/${filename}`;
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
