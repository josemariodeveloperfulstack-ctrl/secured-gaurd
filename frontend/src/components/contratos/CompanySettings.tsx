import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Save, Eye, Loader2, Building2 } from 'lucide-react';
import { companyConfigService, CompanyConfig, ContractTemplatePreviewRequest } from '@/services/companyConfigService';
import { companyService } from '@/services/companyService';
import { getApiUrl } from '@/config/environment';

interface CompanySettingsProps {
  open: boolean;
  onSave: (config: CompanyConfig) => void;
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
    headerText: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE SEGURANÇA',
    footerText: 'Este contrato é regido pelas leis brasileiras e foro da cidade de Contagem/MG.',
    contractTerms: ''
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadAll();
    }
  }, [open]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [companies, activeConfig] = await Promise.all([
        companyService.getAllCompanies(),
        companyConfigService.getActiveConfig()
      ]);
      setCompaniesList(Array.isArray(companies) ? companies : []);

      let companyIdToSet = '';
      if (activeConfig) {
        setConfig(activeConfig);
        if (activeConfig.companyId) {
          companyIdToSet = activeConfig.companyId;
        } else if (activeConfig.cnpj && companies?.length) {
          const match = companies.find((c: any) =>
            (c.cnpj || '').replace(/\D/g, '') === (activeConfig.cnpj || '').replace(/\D/g, '')
          );
          if (match) companyIdToSet = match.id;
        }
      }
      if (!companyIdToSet && companies?.length > 0) {
        companyIdToSet = companies[0].id;
      }
      setSelectedCompanyId(companyIdToSet);

      if (!activeConfig && companies?.length > 0) {
        const first = companies[0];
        const addr = [first.address, first.enderecoRua, first.city, first.state, first.zipCode].filter(Boolean).join(', ');
        setConfig({
          name: first.name || '',
          cnpj: first.cnpj || '',
          address: addr || '',
          city: first.city || '',
          state: first.state || '',
          zipCode: first.zipCode || '',
          phone: first.phone || '',
          email: first.email || '',
          website: first.website || '',
          logoUrl: first.logoUrl || '',
          headerText: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE SEGURANÇA',
          footerText: 'Este contrato é regido pelas leis brasileiras e foro da cidade de Contagem/MG.',
          contractTerms: `CLÁUSULAS E CONDIÇÕES:

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
   - Foro da comarca de Contagem/MG para questões judiciais`
        });
      } else if (!activeConfig && companies?.length === 0) {
        setConfig(prev => ({ ...prev, name: '', cnpj: '', address: '', city: '', state: '', zipCode: '', phone: '', email: '', website: '' }));
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações da empresa.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
    const company = companiesList.find((c: any) => c.id === companyId);
    if (company) {
      const address = [company.address, company.enderecoRua, company.city, company.state, company.zipCode]
        .filter(Boolean).join(', ');
      setConfig(prev => ({
        ...prev,
        companyId: companyId,
        name: company.name || prev.name,
        cnpj: company.cnpj || prev.cnpj,
        address: address || prev.address,
        city: company.city || prev.city,
        state: company.state || prev.state,
        zipCode: company.zipCode || prev.zipCode,
        phone: company.phone || prev.phone,
        email: company.email || prev.email,
        website: company.website || prev.website,
        logoUrl: company.logoUrl || ''
      }));
    }
  };

  const getLogoDisplayUrl = (logoUrl: string | undefined): string | null => {
    if (!logoUrl) return null;
    const baseUrl = getApiUrl().replace('/api', '');
    const normalized = logoUrl.startsWith('/') ? logoUrl : `/${logoUrl}`;
    if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) return logoUrl;
    if (normalized.startsWith('/api/uploads/')) return `${baseUrl}${normalized}`;
    if (normalized.startsWith('/uploads/')) return `${baseUrl}/api${normalized}`;
    return `${baseUrl}/api/uploads/companies/logos/${logoUrl.replace(/^\/+/, '')}`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!selectedCompanyId) {
        toast({
          title: "Empresa não selecionada",
          description: "Selecione uma empresa da tabela de empresas cadastradas.",
          variant: "destructive"
        });
        return;
      }

      const configToSave = { ...config, companyId: selectedCompanyId };
      const savedConfig = await companyConfigService.saveConfig(configToSave);
      onSave(savedConfig);
      
      toast({
        title: "Configurações Salvas",
        description: "As configurações da empresa foram salvas com sucesso no banco de dados.",
      });
    } catch (error: any) {
      console.error('Erro ao salvar configuração:', error);
      toast({
        title: "Erro ao Salvar",
        description: error.message || "Não foi possível salvar as configurações da empresa.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedCompanyId) {
      toast({
        title: "Empresa não selecionada",
        description: "Selecione uma empresa antes de visualizar o preview.",
        variant: "destructive"
      });
      return;
    }
    setPreviewLoading(true);
    try {
      const request: ContractTemplatePreviewRequest = {
        companyId: selectedCompanyId,
        headerText: config.headerText,
        footerText: config.footerText,
        contractTerms: config.contractTerms
      };
      const blob = await companyConfigService.generatePreviewPdf(request);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error: any) {
      console.error('Erro ao gerar preview PDF:', error);
      toast({
        title: "Erro ao gerar preview",
        description: error.message || "Não foi possível gerar o PDF do template.",
        variant: "destructive"
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="space-y-6">
      {/* Seletor de Empresa - tabela Companies */}
      {companiesList.length > 0 && (
        <Card className="bg-seguranca-graphite border-gray-600">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
              <Building2 size={18} />
              Empresa no cabeçalho, rodapé e contrato
            </CardTitle>
            <p className="text-sm text-gray-400 mt-1">
              Selecione a empresa da tabela de empresas cadastradas. Os dados vêm da tabela Companies.
            </p>
          </CardHeader>
          <CardContent>
            <Select value={selectedCompanyId || companiesList[0]?.id} onValueChange={handleSelectCompany}>
              <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent className="bg-seguranca-graphite border-gray-600">
                {companiesList.map((c: any) => (
                  <SelectItem key={c.id} value={c.id} className="text-seguranca-lightgray">
                    {c.name} {c.cnpj ? `- ${c.cnpj}` : c.sigla ? ` (${c.sigla})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCompanyId && config.name && (
              <div className="mt-4 p-4 bg-seguranca-black rounded-lg border border-gray-600">
                <p className="text-xs text-gray-400 mb-2">Dados da empresa selecionada (da tabela Companies):</p>
                <div className="flex items-start gap-4">
                  {config.logoUrl && (() => {
                    const logoDisplayUrl = getLogoDisplayUrl(config.logoUrl);
                    return logoDisplayUrl ? <img src={logoDisplayUrl} alt="Logo" className="max-h-16 object-contain" /> : null;
                  })()}
                  <div>
                    <p className="text-seguranca-lightgray font-medium">{config.name}</p>
                    {config.cnpj && <p className="text-gray-300 text-sm">CNPJ: {config.cnpj}</p>}
                    {config.address && <p className="text-gray-300 text-sm">Endereço: {config.address}</p>}
                    {(config.phone || config.email) && (
                      <p className="text-gray-300 text-sm">Tel: {config.phone || '-'} | Email: {config.email || '-'}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Template do Contrato */}
      <Card className="bg-seguranca-graphite border-gray-600">
        <CardHeader>
          <CardTitle className="text-seguranca-lightgray">Template do Contrato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-seguranca-lightgray">Título do Cabeçalho</Label>
            <Input
              value={config.headerText}
              onChange={(e) => setConfig(prev => ({ ...prev, headerText: e.target.value }))}
              className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
            />
          </div>

          <div>
            <Label className="text-seguranca-lightgray">Texto do Rodapé</Label>
            <Textarea
              value={config.footerText}
              onChange={(e) => setConfig(prev => ({ ...prev, footerText: e.target.value }))}
              className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
              rows={2}
            />
          </div>

          <div>
            <Label className="text-seguranca-lightgray">Cláusulas e Condições do Contrato</Label>
            <Textarea
              value={config.contractTerms}
              onChange={(e) => setConfig(prev => ({ ...prev, contractTerms: e.target.value }))}
              className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
              rows={15}
            />
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex justify-between">
        <Button
          onClick={handlePreview}
          disabled={previewLoading || !selectedCompanyId}
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
          disabled={saving || loading}
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
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
