import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileText,
  Download,
  Eye,
  Printer,
  Mail,
  Settings,
  CheckCircle,
  Loader2,
  Building2,
  Sparkles
} from 'lucide-react';
import { Contract, contractService } from '@/services/contractService';
import { companyConfigService, CompanyConfig } from '@/services/companyConfigService';
import { clientService } from '@/services/clientService';
import { companyService } from '@/services/companyService';
import { ClientFormModal } from '@/components/clientes/ClientFormModal';
import { Client } from '@/types/client';
import { formatDateForBackend, formatDateForDisplay, parseDateFromBackend, parseBrazilianDateString } from '@/utils/dateUtils';
import { getApiUrl } from '@/config/environment';
import { ClientSearchCombobox } from '@/components/ui/client-search-combobox';
import { workPostService, WorkPost } from '@/services/workPostService';
import { Checkbox } from '@/components/ui/checkbox';


interface ContractGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract | null;
  onConfigureCompany: () => void;
}

interface ContractData {
  contractNumber: string;
  clientName: string;
  clientDocument: string;
  clientAddress: string;
  clientPhone: string;
  clientEmail: string;
  description: string;
  value: number;
  startDate: string;
  endDate?: string;
  additionalTerms?: string;
  paymentTerms?: string;
  observations?: string;
}

export const ContractGenerator: React.FC<ContractGeneratorProps> = ({
  open,
  onOpenChange,
  contract,
  onConfigureCompany
}) => {
  const { toast } = useToast();
  const [contractData, setContractData] = useState<ContractData>({
    contractNumber: '',
    clientName: '',
    clientDocument: '',
    clientAddress: '',
    clientPhone: '',
    clientEmail: '',
    description: '',
    value: 0,
    startDate: '',
    endDate: '',
    additionalTerms: '',
    paymentTerms: 'Pagamento mensal até o dia 10 de cada mês',
    observations: ''
  });

  const [companyConfig, setCompanyConfig] = useState<CompanyConfig | null>(null);
  const [companiesList, setCompaniesList] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [step, setStep] = useState<'form' | 'preview' | 'generated' | 'viewing'>('form');
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  const [workPosts, setWorkPosts] = useState<WorkPost[]>([]);
  const [workPostsLoading, setWorkPostsLoading] = useState(false);
  const [selectedWorkPostIds, setSelectedWorkPostIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setStep('form'); // Resetar para o formulário ao abrir o modal
      setGeneratedPdfUrl(null);
      loadCompanyConfig();
      loadCompaniesList();
      loadClients();
      setWorkPosts([]);
      setSelectedWorkPostIds([]);

      // Carregar dados do contrato se fornecido
      if (contract) {
        setSelectedClientId(contract.clientId || '');
        setContractData({
          contractNumber: contract.contractNumber,
          clientName: contract.clientName,
          clientDocument: '',
          clientAddress: '',
          clientPhone: '',
          clientEmail: '',
          description: contract.description,
          value: contract.value,
          startDate: contract.startDate,
          endDate: contract.endDate || '',
          additionalTerms: '',
          paymentTerms: 'Pagamento mensal até o dia 10 de cada mês',
          observations: contract.notes || ''
        });
      } else {
        setSelectedClientId('');
      }
    }
  }, [open, contract]);

  // Carregar os postos de trabalho do cliente selecionado de forma reativa
  useEffect(() => {
    if (selectedClientId) {
      setWorkPostsLoading(true);
      workPostService.getWorkPostsByClient(selectedClientId)
        .then(posts => {
          setWorkPosts(Array.isArray(posts) ? posts : []);
        })
        .catch(err => {
          console.error("Erro ao carregar postos de trabalho do cliente:", err);
          setWorkPosts([]);
        })
        .finally(() => {
          setWorkPostsLoading(false);
        });
    } else {
      setWorkPosts([]);
      setSelectedWorkPostIds([]);
    }
  }, [selectedClientId]);

  // Preencher dados do cliente quando a lista carregar e houver contract com clientId
  useEffect(() => {
    if (contract?.clientId && clients.length > 0) {
      const client = clients.find((c: any) => c.id === contract.clientId);
      if (client) {
        const composedAddress = [client.address, client.city, client.state, client.zipCode]
          .filter(Boolean)
          .join(', ');
        setContractData(prev => ({
          ...prev,
          clientDocument: client.cnpj || prev.clientDocument,
          clientAddress: composedAddress || prev.clientAddress,
          clientPhone: client.phone || client.mobile || prev.clientPhone,
          clientEmail: client.email || client.contactEmail || prev.clientEmail
        }));
      }
    }
  }, [clients, contract?.clientId]);

  // Revogar URL do PDF quando o modal fechar
  useEffect(() => {
    if (!open && generatedPdfUrl) {
      window.URL.revokeObjectURL(generatedPdfUrl);
      setGeneratedPdfUrl(null);
    }
  }, [open, generatedPdfUrl]);

  const generateContractNumber = () => {
    if (!selectedClientId && !contractData.clientName) {
      toast({
        title: 'Aviso',
        description: 'Selecione um cliente primeiro',
        variant: 'destructive'
      });
      return;
    }

    const selectedClient = clients.find((c: any) => c.id === selectedClientId);
    const clientName = (selectedClient?.name || contractData.clientName || '').toUpperCase().trim();
    if (!clientName) {
      toast({
        title: 'Aviso',
        description: 'Selecione um cliente primeiro',
        variant: 'destructive'
      });
      return;
    }

    const words = clientName.split(' ').filter((w: string) => w.length > 0);
    const sigla = words.map((w: string) => w.charAt(0)).join('').substring(0, 4);
    const currentYear = new Date().getFullYear();
    const randomSuffix = Math.random().toString(36).substr(2, 4).toUpperCase();
    const contractNumber = `CON-${sigla}-${currentYear}-${randomSuffix}`;

    setContractData(prev => ({ ...prev, contractNumber }));
    toast({
      title: 'Número Gerado',
      description: `Número do contrato gerado automaticamente: ${contractNumber}`,
    });
  };

  const loadCompanyConfig = async () => {
    setLoadingConfig(true);
    try {
      const activeConfig = await companyConfigService.getActiveConfig();
      setCompanyConfig(activeConfig);
    } catch (error) {
      console.error('Erro ao carregar configuração da empresa:', error);
    } finally {
      setLoadingConfig(false);
    }
  };

  const loadCompaniesList = async () => {
    try {
      const list = await companyService.getAllCompanies();
      setCompaniesList(Array.isArray(list) ? list : []);
      if (list?.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(list[0].id || '');
      }
    } catch {
      setCompaniesList([]);
    }
  };

  // Sincronizar empresa selecionada com a config (empresa definida em Config. Empresa)
  useEffect(() => {
    if (open && companyConfig?.companyId && companiesList.length > 0) {
      const found = companiesList.some((c: any) => c.id === companyConfig.companyId);
      if (found) setSelectedCompanyId(companyConfig.companyId);
    }
  }, [open, companyConfig?.companyId, companiesList]);

  const handleSelectCompany = (id: string) => {
    setSelectedCompanyId(id);
  };

  const selectedCompany = selectedCompanyId
    ? companiesList.find((c) => c.id === selectedCompanyId)
    : companiesList[0];

  // Para preview: empresa (cabeçalho) vem da tabela Companies; termos (cláusulas, rodapé) de CompanyConfig
  const configForContract = selectedCompany
    ? {
        ...selectedCompany,
        headerText: companyConfig?.headerText,
        contractTerms: companyConfig?.contractTerms,
        footerText: companyConfig?.footerText
      }
    : companyConfig;

  const loadClients = async () => {
    setClientsLoading(true);
    try {
      const result = await clientService.getClients({ page: 0, size: 1000 });
      const list = Array.isArray(result) ? result : (result?.content || []);
      setClients(list);
    } catch (e) {
      console.error('Erro ao carregar clientes para o gerador de contrato:', e);
    } finally {
      setClientsLoading(false);
    }
  };

  const handleSelectClient = async (clientId: string) => {
    setSelectedClientId(clientId);
    let selected = clients.find((c: any) => c.id === clientId);
    if (!selected && clientId) {
      try {
        selected = await clientService.getClientById(clientId);
      } catch (err) {
        console.error('Erro ao buscar detalhes do cliente:', err);
      }
    }
    if (!selected) return;
    const composedAddress = [selected.address, selected.city, selected.state, selected.zipCode]
      .filter(Boolean)
      .join(', ');
    setContractData(prev => ({
      ...prev,
      clientName: selected.name || '',
      clientDocument: selected.cnpj || '',
      clientAddress: composedAddress,
      clientPhone: selected.phone || selected.mobile || '',
      clientEmail: selected.email || selected.contactEmail || ''
    }));
  };

  const handleClientCreated = (createdClient?: Client) => {
    setIsClientModalOpen(false);
    loadClients();
    if (createdClient?.id) {
      setSelectedClientId(createdClient.id);
      const composedAddress = [createdClient.address, createdClient.city, createdClient.state, createdClient.zipCode]
        .filter(Boolean)
        .join(', ');
      setContractData(prev => ({
        ...prev,
        clientName: createdClient.name || '',
        clientDocument: createdClient.cnpj || '',
        clientAddress: composedAddress,
        clientPhone: createdClient.phone || createdClient.mobile || '',
        clientEmail: createdClient.email || createdClient.contactEmail || ''
      }));
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const d = parseDateFromBackend(dateString) || parseBrazilianDateString(dateString);
    return d ? formatDateForDisplay(d) : '';
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

  const generateContractHTML = () => {
    if (!configForContract) return '';
    const logoUrl = configForContract?.logoUrl && getLogoDisplayUrl(configForContract.logoUrl);
    const selectedWorkPosts = workPosts.filter(wp => selectedWorkPostIds.includes(wp.id));

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Contrato ${contractData.contractNumber}</title>
        <style>
          @page { margin: 2cm; size: A4; }
          * { box-sizing: border-box; }
          body {
            font-family: 'Times New Roman', serif;
            font-size: 12px;
            line-height: 1.5;
            margin: 0;
            padding: 0;
            color: #000;
          }
          .layout-header {
            display: flex;
            align-items: stretch;
            min-height: 100px;
            border-top: 4px solid #FF9900;
          }
          .layout-header-left {
            flex: 0 0 180px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #FFCC00 0%, #FF9900 50%, #FF3333 100%);
            padding: 15px;
          }
          .layout-header-left img {
            max-width: 120px;
            max-height: 80px;
            object-fit: contain;
          }
          .layout-header-right {
            flex: 1;
            display: flex;
            align-items: center;
            padding: 15px 25px;
            background: #1a1a1a;
            color: #fff;
            font-size: 11px;
            line-height: 1.5;
          }
          .layout-header-right strong { color: #fff; }
          .layout-title {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            margin: 25px 0 30px;
            text-transform: uppercase;
            color: #000;
          }
          .content {
            padding: 0 50px 80px;
            text-align: justify;
          }
          .parties {
            margin: 30px 0;
            background-color: #f9f9f9;
            padding: 15px;
            border: 1px solid #ddd;
          }
          .clause { margin: 20px 0; }
          .clause-title { font-weight: bold; margin-bottom: 10px; }
          .signature-section { margin-top: 60px; page-break-inside: avoid; }
          .signature-box {
            border: 1px solid #000;
            height: 80px;
            margin: 20px 0;
            position: relative;
          }
          .signature-label {
            position: absolute;
            bottom: -25px;
            left: 50%;
            transform: translateX(-50%);
            font-weight: bold;
            font-size: 10px;
          }
          .layout-footer {
            margin-top: 50px;
            font-size: 10px;
            text-align: center;
            background: #fafafa;
          }
          .layout-footer-line {
            height: 4px;
            background: linear-gradient(90deg, #FFCC00, #FF9900, #FF3333);
            margin-bottom: 15px;
          }
          .layout-footer-text { padding: 0 50px 30px; }
          .table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .table th, .table td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
          }
          .table th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          .highlight { background-color: #ffffcc; padding: 2px; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="layout-header">
          <div class="layout-header-left">
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo" />` : ''}
          </div>
          <div class="layout-header-right">
            <div>
              <strong>${configForContract?.name}</strong><br>
              CNPJ: ${configForContract?.cnpj}<br>
              ${configForContract?.address}<br>
              ${configForContract?.city}/${configForContract?.state} - CEP: ${configForContract?.zipCode}<br>
              Tel: ${configForContract?.phone} | Email: ${configForContract?.email}
              ${configForContract?.website ? `<br>${configForContract?.website}` : ''}
            </div>
          </div>
        </div>
        <div class="layout-title">${configForContract?.headerText || 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS'}</div>
        
        <div class="content">
          <div class="parties">
            <table class="table">
              <tr>
                <th colspan="2" style="text-align: center; background-color: #e0e0e0;">PARTES CONTRATANTES</th>
              </tr>
              <tr>
                <td style="width: 50%; vertical-align: top;">
                  <strong>CONTRATANTE:</strong><br>
                  <span class="highlight">${contractData.clientName}</span><br>
                  ${contractData.clientDocument ? `CNPJ/CPF: ${contractData.clientDocument}<br>` : ''}
                  ${contractData.clientAddress ? `Endereço: ${contractData.clientAddress}<br>` : ''}
                  ${contractData.clientPhone ? `Telefone: ${contractData.clientPhone}<br>` : ''}
                  ${contractData.clientEmail ? `Email: ${contractData.clientEmail}` : ''}
                </td>
                <td style="width: 50%; vertical-align: top;">
                  <strong>CONTRATADA:</strong><br>
                  <span class="highlight">${configForContract?.name}</span><br>
                  CNPJ: ${configForContract?.cnpj}<br>
                  Endereço: ${configForContract?.address}<br>
                  ${configForContract?.city}/${configForContract?.state} - CEP: ${configForContract?.zipCode}<br>
                  Telefone: ${configForContract?.phone}<br>
                  Email: ${configForContract?.email}
                </td>
              </tr>
            </table>
          </div>

          <div class="clause">
            <div class="clause-title">DADOS DO CONTRATO:</div>
            <table class="table">
              <tr>
                <td><strong>Número do Contrato:</strong></td>
                <td class="highlight">${contractData.contractNumber}</td>
              </tr>
              <tr>
                <td><strong>Valor Total:</strong></td>
                <td class="highlight">${formatCurrency(contractData.value)}</td>
              </tr>
              <tr>
                <td><strong>Data de Início:</strong></td>
                <td class="highlight">${formatDate(contractData.startDate)}</td>
              </tr>
              <tr>
                <td><strong>Data de Término:</strong></td>
                <td class="highlight">${contractData.endDate ? formatDate(contractData.endDate) : 'Prazo Indeterminado'}</td>
              </tr>
              <tr>
                <td><strong>Descrição dos Serviços:</strong></td>
                <td class="highlight">${contractData.description}</td>
              </tr>
            </table>
          </div>

          ${selectedWorkPosts.length > 0 ? `
          <div class="clause">
            <div class="clause-title">POSTOS DE TRABALHO VINCULADOS:</div>
            <table class="table">
              <thead>
                <tr style="background-color: #f0f0f0;">
                  <th>Código</th>
                  <th>Nome do Posto</th>
                  <th>Escala</th>
                  <th>Horário</th>
                  <th>Cidade/UF</th>
                </tr>
              </thead>
              <tbody>
                ${selectedWorkPosts.map(wp => `
                  <tr>
                    <td>${wp.postCode || '-'}</td>
                    <td>${wp.name || '-'}</td>
                    <td>${wp.workSchedule || '-'}</td>
                    <td>${wp.shiftStart && wp.shiftEnd ? `${wp.shiftStart} - ${wp.shiftEnd}` : '-'}</td>
                    <td>${wp.city || '-'}/${wp.state || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          <div class="clause">
            <div class="clause-title">CLÁUSULA 1ª - DO PAGAMENTO:</div>
            <p>${contractData.paymentTerms}</p>
          </div>

          ${contractData.additionalTerms ? `
          <div class="clause">
            <div class="clause-title">CLÁUSULAS ADICIONAIS:</div>
            <div style="white-space: pre-line;">${contractData.additionalTerms}</div>
          </div>
          ` : ''}

          <div class="clause">
            <div style="white-space: pre-line;">${configForContract?.contractTerms || ''}</div>
          </div>

          ${contractData.observations ? `
          <div class="clause">
            <div class="clause-title">OBSERVAÇÕES:</div>
            <div style="white-space: pre-line;">${contractData.observations}</div>
          </div>
          ` : ''}

          <div class="signature-section">
            <p><strong>LOCAL E DATA:</strong></p>
            <p>${configForContract?.city}/${configForContract?.state}, ${formatDate(new Date().toISOString())}</p>
            
            <div style="display: flex; justify-content: space-between; margin-top: 50px;">
              <div style="width: 45%; position: relative;">
                <div class="signature-box">
                  <div class="signature-label">CONTRATANTE</div>
                </div>
                <p style="text-align: center; margin-top: 30px; font-size: 10px;">
                  ${contractData.clientName}<br>
                  ${contractData.clientDocument || 'CNPJ/CPF'}
                </p>
              </div>
              <div style="width: 45%; position: relative;">
                <div class="signature-box">
                  <div class="signature-label">CONTRATADA</div>
                </div>
                <p style="text-align: center; margin-top: 30px; font-size: 10px;">
                  ${configForContract?.name}<br>
                  CNPJ: ${configForContract?.cnpj}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="layout-footer">
          <div class="layout-footer-line"></div>
          <div class="layout-footer-text">${configForContract?.footerText || 'Este contrato é regido pelas leis brasileiras.'}</div>
        </div>
      </body>
      </html>
    `;
  };

  const buildContractPdfPayload = async () => {
    let companyId: string | undefined;
    try {
      const companies = await companyService.getAllCompanies();
      if (companies?.length > 0 && companies[0]?.id) {
        companyId = companies[0].id;
      }
    } catch {
      companyId = undefined;
    }

    const startDateParsed = contractData.startDate
      ? (parseDateFromBackend(contractData.startDate) || parseBrazilianDateString(contractData.startDate))
      : null;
    const endDateParsed = contractData.endDate
      ? (parseDateFromBackend(contractData.endDate) || parseBrazilianDateString(contractData.endDate))
      : null;

    return {
      companyId: selectedCompanyId || companyId || null,
      companyConfigId: companyConfig?.id || null,
      clientName: contractData.clientName || '',
      clientDocument: contractData.clientDocument || '',
      clientAddress: contractData.clientAddress || '',
      clientPhone: contractData.clientPhone || '',
      clientEmail: contractData.clientEmail || '',
      contractNumber: contractData.contractNumber || '',
      description: contractData.description || '',
      value: contractData.value ?? 0,
      startDate: formatDateForBackend(startDateParsed) || null,
      endDate: formatDateForBackend(endDateParsed) || null,
      paymentTerms: contractData.paymentTerms || '',
      additionalTerms: contractData.additionalTerms || '',
      observations: contractData.observations || '',
      city: configForContract?.city || '',
      contractDate: new Date().toISOString().split('T')[0],
      workPostIds: selectedWorkPostIds || [],
    };
  };

  const handlePreview = async () => {
    setGenerating(true);
    try {
      const payload = await buildContractPdfPayload();
      const blob = await contractService.generateContractPdf(payload);
      const url = window.URL.createObjectURL(blob);
      setGeneratedPdfUrl(url);
      window.open(url, '_blank');
      setStep('preview');
      toast({
        title: 'Preview do contrato',
        description: 'Exibindo o contrato com o layout padrão do sistema (igual ao PDF gerado).',
      });
    } catch (error) {
      console.error('Erro ao gerar preview do contrato:', error);
      const msg =
        error instanceof Error ? error.message : 'Não foi possível gerar o preview. Tente novamente.';
      toast({
        title: 'Erro',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleGeneratePDF = async () => {
    setGenerating(true);
    try {
      const payload = await buildContractPdfPayload();
      const blob = await contractService.generateContractPdf(payload);
      const url = window.URL.createObjectURL(blob);
      setGeneratedPdfUrl(url);

      const link = document.createElement('a');
      link.href = url;
      link.download = `contrato_${contractData.contractNumber || 'contrato'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast({
        title: "Contrato Gerado",
        description: "O contrato foi gerado com sucesso com layout profissional.",
      });

      setStep('generated');
    } catch (error) {
      console.error('Erro ao gerar contrato:', error);
      const msg =
        error instanceof Error ? error.message : 'Não foi possível gerar o contrato. Tente novamente.';
      toast({
        title: "Erro",
        description: msg,
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSendByEmail = () => {
    // TODO: Implementar envio por email
    toast({
      title: "Funcionalidade em Desenvolvimento",
      description: "O envio por email será implementado em breve.",
    });
  };

  const handleViewContract = () => {
    if (generatedPdfUrl) {
      setStep('viewing');
    }
  };

  const handleDownloadFromView = () => {
    if (!generatedPdfUrl) return;
    const link = document.createElement('a');
    link.href = generatedPdfUrl;
    link.download = `contrato_${contractData.contractNumber || 'contrato'}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (loadingConfig) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm sm:max-w-md bg-seguranca-graphite border-gray-600 mx-4">
          <DialogHeader>
            <DialogTitle className="text-seguranca-lightgray text-sm sm:text-base">Carregando...</DialogTitle>
            <DialogDescription>Preparando o gerador de contratos...</DialogDescription>
          </DialogHeader>
          <div className="text-center py-6">
            <Loader2 className="h-16 w-16 mx-auto mb-4 text-seguranca-yellow animate-spin" />
            <p className="text-seguranca-lightgray mb-4">
              Carregando configurações da empresa...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!companyConfig && companiesList.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm sm:max-w-md bg-seguranca-graphite border-gray-600 mx-4">
          <DialogHeader>
            <DialogTitle className="text-seguranca-lightgray text-sm sm:text-base">Configuração Necessária</DialogTitle>
            <DialogDescription>Configure os dados da empresa para continuar</DialogDescription>
          </DialogHeader>
          <div className="text-center py-6">
            <Settings className="h-16 w-16 mx-auto mb-4 text-seguranca-yellow" />
            <p className="text-seguranca-lightgray mb-4">
              Para gerar contratos, é necessário configurar primeiro os dados da empresa no banco de dados.
            </p>
            <Button
              onClick={onConfigureCompany}
              className="bg-seguranca-red hover:bg-seguranca-darkred text-white"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurar Empresa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-2xl lg:max-w-4xl bg-seguranca-graphite border-gray-600 max-h-[90vh] overflow-y-auto mx-4">
        <DialogHeader>
          <DialogTitle className="text-seguranca-lightgray text-sm sm:text-base lg:text-lg">
            Gerar Contrato Personalizado
          </DialogTitle>
          <DialogDescription>Preencha os dados para gerar um contrato personalizado</DialogDescription>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-4 sm:space-y-6 text-seguranca-lightgray">
            {/* Empresa para cabeçalho/rodapé/contrato (tabela Companies) */}
            {companiesList.length > 0 && (
              <Card className="bg-seguranca-black border-gray-600">
                <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
                  <CardTitle className="text-seguranca-lightgray text-xs sm:text-sm flex items-center gap-2">
                    <Building2 size={16} />
                    Empresa no cabeçalho, rodapé e cláusulas
                  </CardTitle>
                  <p className="text-xs text-gray-400 mt-1">Selecione da lista de empresas cadastradas</p>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-4">
                  <Select value={selectedCompanyId || companiesList[0]?.id} onValueChange={handleSelectCompany}>
                    <SelectTrigger className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray">
                      <SelectValue placeholder="Selecione a empresa" />
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-graphite border-gray-600">
                      {companiesList.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-seguranca-lightgray">
                          {c.name} {c.cnpj ? `- ${c.cnpj}` : c.sigla ? ` (${c.sigla})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}

            {/* Dados do Cliente - seleção obrigatória */}
            <Card className="bg-seguranca-black border-gray-600">
              <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
                <CardTitle className="text-seguranca-lightgray text-xs sm:text-sm">
                  Dados do Cliente
                </CardTitle>
                <p className="text-xs text-gray-400 mt-1">Selecione um cliente cadastrado. O cliente deve estar cadastrado antes de gerar o contrato.</p>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <div className="flex-1">
                    <Label className="text-seguranca-lightgray text-xs sm:text-sm">Cliente *</Label>
                    <ClientSearchCombobox
                      value={selectedClientId}
                      onChange={(v) => {
                        if (!v) {
                          setSelectedClientId('');
                          setContractData(prev => ({ ...prev, clientName: '', clientDocument: '', clientAddress: '', clientPhone: '', clientEmail: '' }));
                        } else {
                          handleSelectClient(v);
                        }
                      }}
                      minChars={1}
                      placeholder="Selecione ou busque por CNPJ/Nome"
                      initialDisplayName={contractData.clientName}
                      disabled={clientsLoading}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsClientModalOpen(true)}
                    className="border-seguranca-yellow text-seguranca-yellow hover:bg-seguranca-yellow hover:text-black shrink-0"
                  >
                    Cadastrar cliente
                  </Button>
                </div>

                {selectedClientId && contractData.clientName && (
                  <div className="bg-seguranca-graphite border border-gray-600 rounded-lg p-4 text-sm">
                    <p className="text-gray-400 text-xs mb-2">Dados do cliente selecionado:</p>
                    <p className="text-seguranca-lightgray font-medium">{contractData.clientName}</p>
                    {contractData.clientDocument && <p className="text-gray-300">CNPJ/CPF: {contractData.clientDocument}</p>}
                    {contractData.clientAddress && <p className="text-gray-300">Endereço: {contractData.clientAddress}</p>}
                    {(contractData.clientPhone || contractData.clientEmail) && (
                      <p className="text-gray-300">Tel: {contractData.clientPhone || '-'} | Email: {contractData.clientEmail || '-'}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedClientId && (
              <Card className="bg-seguranca-black border-2 border-zinc-800 rounded-none mt-4">
                <CardHeader className="px-3 sm:px-6 py-3 sm:py-4 border-b border-zinc-800">
                  <div>
                    <CardTitle className="text-seguranca-lightgray text-xs sm:text-sm font-mono tracking-wider text-yellow-500 uppercase">
                      [SETORES DE TRABALHO DO CLIENTE]
                    </CardTitle>
                    <p className="text-xs text-gray-400 mt-1">
                      Selecione os setores e postos já cadastrados no cliente. O cadastro completo é feito na ficha do cliente.
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 px-3 sm:px-6 py-4">
                  {workPostsLoading ? (
                    <div className="flex items-center gap-2 text-seguranca-lightgray text-sm py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
                      <span>Carregando setores de trabalho do cliente...</span>
                    </div>
                  ) : workPosts.length === 0 ? (
                    <div className="p-6 border-2 border-dashed border-zinc-800 text-center rounded-none flex flex-col items-center gap-3">
                      <p className="text-zinc-500 text-sm font-mono uppercase font-bold tracking-wider">
                        [Nenhum setor de trabalho cadastrado para este cliente]
                      </p>
                      <p className="text-xs text-zinc-600">
                        Cadastre setores e postos na ficha do cliente e depois volte a este contrato.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 justify-end border-b border-zinc-800 pb-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedWorkPostIds(workPosts.map(wp => wp.id))}
                          className="h-7 text-xs font-mono border border-zinc-800 rounded-none bg-zinc-900 text-yellow-500 hover:bg-yellow-500 hover:text-black"
                        >
                          [SELECIONAR TODOS]
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedWorkPostIds([])}
                          className="h-7 text-xs font-mono border border-zinc-800 rounded-none bg-zinc-900 text-zinc-400 hover:bg-red-600 hover:text-white"
                        >
                          [LIMPAR SELEÇÃO]
                        </Button>
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {workPosts.map((wp) => {
                          const isSelected = selectedWorkPostIds.includes(wp.id);
                          return (
                            <div
                              key={wp.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedWorkPostIds(prev => prev.filter(id => id !== wp.id));
                                } else {
                                  setSelectedWorkPostIds(prev => [...prev, wp.id]);
                                }
                              }}
                              className={`flex items-start gap-3 p-3 border-2 transition-all cursor-pointer rounded-none ${
                                isSelected
                                  ? 'border-yellow-500 bg-yellow-500/5 text-seguranca-lightgray'
                                  : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
                              }`}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedWorkPostIds(prev => [...prev, wp.id]);
                                  } else {
                                    setSelectedWorkPostIds(prev => prev.filter(id => id !== wp.id));
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="mt-0.5 rounded-none border-2 border-zinc-600 data-[state=checked]:bg-yellow-500 data-[state=checked]:text-black data-[state=checked]:border-yellow-500"
                              />
                              <div className="flex-1 font-mono text-xs space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-seguranca-lightgray truncate">{wp.name}</span>
                                  {wp.postCode && (
                                    <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-500 text-[10px] uppercase font-semibold shrink-0">
                                      COD: {wp.postCode}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  <span className="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 text-[10px] uppercase font-semibold">
                                    {(wp.type || '').replace(/^POSTO_/, 'Posto ').replace(/_/g, ' ') || 'Posto'}
                                  </span>
                                  {wp.primaryPositionName && (
                                    <span className="text-zinc-500">Cargo: <strong className="text-zinc-400">{wp.primaryPositionName}</strong></span>
                                  )}
                                </div>
                                <div className="text-zinc-500 flex flex-wrap gap-x-3 gap-y-1">
                                  {wp.workSchedule && (
                                    <span>Escala: <strong className="text-zinc-400">{wp.workSchedule}</strong></span>
                                  )}
                                  {wp.shiftStart && wp.shiftEnd && (
                                    <span>Horário: <strong className="text-zinc-400">{wp.shiftStart} - {wp.shiftEnd}</strong></span>
                                  )}
                                  {(wp.city || wp.state) && (
                                    <span>Local: <strong className="text-zinc-400">{wp.city || '-'}/{wp.state || '-'}</strong></span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 text-right">
                        {selectedWorkPostIds.length} de {workPosts.length} setor(es) selecionado(s)
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <ClientFormModal
              isOpen={isClientModalOpen}
              onClose={() => setIsClientModalOpen(false)}
              onSuccess={handleClientCreated}
            />

            {/* Dados do Contrato */}
            <Card className="bg-seguranca-black border-gray-600">
              <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
                <CardTitle className="text-seguranca-lightgray text-xs sm:text-sm">
                  Dados do Contrato
                </CardTitle>
                <p className="text-xs text-gray-400 mt-1">Número, valor, datas e descrição</p>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label className="text-seguranca-lightgray text-xs sm:text-sm">Número do Contrato *</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={contractData.contractNumber}
                        onChange={(e) => setContractData(prev => ({ ...prev, contractNumber: e.target.value }))}
                        placeholder="Deixe em branco para gerar"
                        className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray"
                      />
                      <Button
                        type="button"
                        onClick={generateContractNumber}
                        disabled={!selectedClientId && !contractData.clientName}
                        className="bg-seguranca-graphite border border-gray-600 hover:bg-yellow-500 hover:text-black h-10 px-3 shrink-0"
                        title="Gerar número com base no nome do cliente"
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-seguranca-lightgray text-xs sm:text-sm">Valor Total (R$) *</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={contractData.value || ''}
                      onChange={(e) => setContractData(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                      placeholder="0,00"
                      className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label className="text-seguranca-lightgray text-xs sm:text-sm">Data de Início *</Label>
                    <Input
                      type="date"
                      value={formatDateForBackend(parseDateFromBackend(contractData.startDate) || parseBrazilianDateString(contractData.startDate)) ?? (contractData.startDate?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? '')}
                      onChange={(e) => setContractData(prev => ({ ...prev, startDate: e.target.value || '' }))}
                      className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-seguranca-lightgray text-xs sm:text-sm">Data de Término</Label>
                    <Input
                      type="date"
                      value={formatDateForBackend(parseDateFromBackend(contractData.endDate) || parseBrazilianDateString(contractData.endDate)) ?? (contractData.endDate?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? '')}
                      onChange={(e) => setContractData(prev => ({ ...prev, endDate: e.target.value || '' }))}
                      className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-seguranca-lightgray text-xs sm:text-sm">Descrição dos Serviços</Label>
                  <Textarea
                    value={contractData.description}
                    onChange={(e) => setContractData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva os serviços contratados..."
                    className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray mt-1"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Termos Adicionais */}
            <Card className="bg-seguranca-black border-gray-600">
              <CardHeader>
                <CardTitle className="text-seguranca-lightgray text-sm">
                  Termos do Contrato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-seguranca-lightgray">Condições de Pagamento</Label>
                  <Textarea
                    value={contractData.paymentTerms}
                    onChange={(e) => setContractData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                    className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray"
                    rows={2}
                  />
                </div>

                <div>
                  <Label className="text-seguranca-lightgray">Cláusulas Adicionais</Label>
                  <Textarea
                    value={contractData.additionalTerms}
                    onChange={(e) => setContractData(prev => ({ ...prev, additionalTerms: e.target.value }))}
                    className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray"
                    rows={4}
                    placeholder="Adicione cláusulas específicas para este contrato..."
                  />
                </div>

                <div>
                  <Label className="text-seguranca-lightgray">Observações</Label>
                  <Textarea
                    value={contractData.observations}
                    onChange={(e) => setContractData(prev => ({ ...prev, observations: e.target.value }))}
                    className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button
                type="button"
                onClick={onConfigureCompany}
                variant="outline"
                className="border-blue-500 text-blue-400 hover:bg-blue-500/20 hover:border-blue-400"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurar Empresa
              </Button>

              <div className="flex gap-3">
                <Button
                  onClick={handlePreview}
                  disabled={generating}
                  variant="outline"
                  className="border-seguranca-yellow text-seguranca-yellow hover:bg-seguranca-yellow hover:text-black"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Preview
                </Button>

                <Button
                  onClick={handleGeneratePDF}
                  disabled={generating || !contractData.clientName}
                  className="bg-seguranca-red hover:bg-seguranca-darkred text-white"
                >
                  {generating ? (
                    <>Gerando...</>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Gerar Contrato
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'generated' && (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-medium text-seguranca-lightgray mb-2">
              Contrato Gerado com Sucesso!
            </h3>
            <p className="text-gray-400 mb-6">
              O contrato {contractData.contractNumber} foi gerado e está pronto.
            </p>

            <div className="flex justify-center gap-4">
              <Button
                onClick={handleViewContract}
                variant="outline"
                className="border-seguranca-yellow text-seguranca-yellow hover:bg-seguranca-yellow hover:text-black"
              >
                <Eye className="h-4 w-4 mr-2" />
                Ver Contrato
              </Button>

              <Button
                onClick={handleSendByEmail}
                variant="outline"
                className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
              >
                <Mail className="h-4 w-4 mr-2" />
                Enviar por Email
              </Button>

              <Button
                onClick={() => setStep('form')}
                className="bg-seguranca-red hover:bg-seguranca-darkred text-white"
              >
                <FileText className="h-4 w-4 mr-2" />
                Gerar Outro
              </Button>
            </div>
          </div>
        )}

        {step === 'viewing' && generatedPdfUrl && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-seguranca-lightgray">
                Visualização do Contrato
              </h3>
              <div className="flex gap-2">
                <Button
                  onClick={handleDownloadFromView}
                  className="bg-seguranca-red hover:bg-seguranca-darkred text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar PDF
                </Button>
                <Button
                  onClick={() => setStep('generated')}
                  variant="outline"
                  className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
                >
                  Voltar
                </Button>
              </div>
            </div>
            <div className="w-full h-[70vh] min-h-[400px] rounded-lg overflow-hidden border border-gray-600 bg-seguranca-black">
              <iframe
                src={generatedPdfUrl}
                title="PDF do Contrato"
                className="w-full h-full"
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
