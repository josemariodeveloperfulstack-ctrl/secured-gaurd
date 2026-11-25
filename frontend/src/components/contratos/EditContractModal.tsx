import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, X, FileText, TrendingUp, FolderOpen, MapPin, Download, Building2, ScrollText, RefreshCw, Sparkles } from 'lucide-react';
import { Contract, contractService, UpdateContractRequest } from '@/services/contractService';
import { clientService, Client } from '@/services/clientService';
import { workPostService } from '@/services/workPostService';
import { companyService } from '@/services/companyService';
import { companyConfigService } from '@/services/companyConfigService';
import {
  companyContractTemplateService,
  CONTRACT_TEMPLATE_LABELS,
  ContractTemplateKey,
  getAllowedTemplateKeysForCompany,
} from '@/services/companyContractTemplateService';
import { ContractAmendmentsTab } from './ContractAmendmentsTab';
import { ContractAdjustmentsTab } from './ContractAdjustmentsTab';
import { ContractDocumentsTab } from './ContractDocumentsTab';
import { ContractPostosTab } from './ContractPostosTab';

interface EditContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract | null;
  onSuccess: () => void;
}

export const EditContractModal: React.FC<EditContractModalProps> = ({
  open,
  onOpenChange,
  contract,
  onSuccess
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);

  // Empresa executora e configuração de minuta (TERC, VIG, ADM)
  const [companies, setCompanies] = useState<any[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<ContractTemplateKey>('ARMADA');
  const [allowedTemplateKeys, setAllowedTemplateKeys] = useState<ContractTemplateKey[]>(['ARMADA', 'DESARMADA']);
  const [headerText, setHeaderText] = useState('CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE SEGURANÇA');
  const [footerText, setFooterText] = useState('Este contrato é regido pelas leis brasileiras e foro da cidade de Contagem/MG.');
  const [contractTerms, setContractTerms] = useState<string>('');
  const [representativeName, setRepresentativeName] = useState<string>('');
  const [representativeCpf, setRepresentativeCpf] = useState<string>('');
  const [loadingCompanyConfig, setLoadingCompanyConfig] = useState(false);

  const [formData, setFormData] = useState<UpdateContractRequest & Record<string, any>>({
    id: '',
    contractNumber: '',
    description: '',
    startDate: '',
    endDate: '',
    value: 0,
    status: 'DRAFT',
    clientId: '',
    notes: '',
    contractOrigin: 'MANUAL',
    contractType: 'VIGILANCIA_PATRIMONIAL',
    responsibleCommercialId: undefined,
    responsibleManagerId: undefined,
    monthlyValue: undefined,
    annualValue: undefined,
    adjustmentType: undefined,
    nextAdjustmentDate: undefined,
    autoRenewal: false,
    replacementTimeHours: undefined,
    maxAbsenceMinutes: undefined,
    patrolFrequency: '',
    reportsRequired: '',
    obligationsContractor: '',
    obligationsContracted: '',
    penalties: ''
  });

  useEffect(() => {
    if (!open) return;
    loadClients();
    loadCompanies();
    if (!contract) return;

    const applyContractToForm = (c: Contract) => {
      setFormData({
        id: c.id,
        contractNumber: c.contractNumber,
        description: c.description,
        startDate: (c.startDate || '').split('T')[0] || c.startDate || '',
        endDate: (c.endDate || '').split('T')[0] || c.endDate || '',
        value: typeof c.value === 'number' ? c.value : parseFloat(String(c.value)) || 0,
        status: c.status || 'DRAFT',
        clientId: c.clientId || '',
        notes: c.notes || '',
        contractOrigin: c.contractOrigin || 'MANUAL',
        contractType: c.contractType || 'VIGILANCIA_PATRIMONIAL',
        responsibleCommercialId: c.responsibleCommercialId,
        responsibleManagerId: c.responsibleManagerId,
        monthlyValue: c.monthlyValue,
        annualValue: c.annualValue,
        adjustmentType: c.adjustmentType,
        nextAdjustmentDate: c.nextAdjustmentDate,
        autoRenewal: c.autoRenewal || false,
        replacementTimeHours: c.replacementTimeHours,
        maxAbsenceMinutes: c.maxAbsenceMinutes,
        patrolFrequency: c.patrolFrequency || '',
        reportsRequired: c.reportsRequired || '',
        obligationsContractor: c.obligationsContractor || '',
        obligationsContracted: c.obligationsContracted || '',
        penalties: c.penalties || ''
      });

      if (c.notes) {
        setContractTerms(c.notes);
      }
      if ((c as any).representativeName) {
        setRepresentativeName((c as any).representativeName);
      }
      if ((c as any).representativeCpf) {
        setRepresentativeCpf((c as any).representativeCpf);
      }
      if ((c as any).companyId) {
        setSelectedCompanyId((c as any).companyId);
      }
      if ((c as any).contractTemplateKey) {
        setSelectedTemplateKey((c as any).contractTemplateKey);
      }
    };

    // Se a lista veio sem clientId (ex.: lazy não carregou), buscar contrato completo por ID
    if (!contract.clientId && contract.id) {
      contractService.getContractById(contract.id)
        .then(applyContractToForm)
        .catch(() => applyContractToForm(contract));
    } else {
      applyContractToForm(contract);
    }
  }, [open, contract]);

  const loadCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const comps = await companyService.getAllCompanies();
      const list = Array.isArray(comps) ? comps : [];
      setCompanies(list);
      if (list.length > 0) {
        const found = selectedCompanyId ? list.find(c => c.id === selectedCompanyId) : list[0];
        const activeComp = found || list[0];
        if (!selectedCompanyId) {
          setSelectedCompanyId(activeComp.id);
        }
        const allowed = getAllowedTemplateKeysForCompany(activeComp);
        setAllowedTemplateKeys(allowed);
        if (allowed.length > 0 && !allowed.includes(selectedTemplateKey)) {
          setSelectedTemplateKey(allowed[0]);
        }
        try {
          const cfg = await companyConfigService.getConfig(activeComp.id);
          if (cfg) {
            if (cfg.headerText) setHeaderText(cfg.headerText);
            if (cfg.footerText) setFooterText(cfg.footerText);
            if (cfg.contractTerms && !contractTerms) setContractTerms(cfg.contractTerms);
          }
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar empresas:', err);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleCompanyChange = async (companyId: string) => {
    setSelectedCompanyId(companyId);
    const comp = companies.find(c => c.id === companyId);
    const allowed = getAllowedTemplateKeysForCompany(comp);
    setAllowedTemplateKeys(allowed);
    if (allowed.length > 0 && !allowed.includes(selectedTemplateKey)) {
      setSelectedTemplateKey(allowed[0]);
    }
    try {
      setLoadingCompanyConfig(true);
      const cfg = await companyConfigService.getConfig(companyId);
      if (cfg) {
        if (cfg.headerText) setHeaderText(cfg.headerText);
        if (cfg.footerText) setFooterText(cfg.footerText);
        if (cfg.contractTerms) setContractTerms(cfg.contractTerms);
      }
    } catch (err) {
      console.warn('Erro ao carregar config da empresa:', err);
    } finally {
      setLoadingCompanyConfig(false);
    }
  };

  const handleReloadCompanyClauses = async () => {
    if (!selectedCompanyId) return;
    try {
      setLoadingCompanyConfig(true);
      const cfg = await companyConfigService.getConfig(selectedCompanyId);
      if (cfg?.contractTerms) {
        setContractTerms(cfg.contractTerms);
        toast({
          title: 'Cláusulas recarregadas',
          description: 'Termos atualizados conforme a configuração da empresa selecionada.',
        });
      }
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as cláusulas da empresa.',
        variant: 'destructive',
      });
    } finally {
      setLoadingCompanyConfig(false);
    }
  };

  const loadClients = async () => {
    setLoadingClients(true);
    try {
      let list: any[] = [];
      try {
        const allClients = await clientService.getAllClients();
        if (Array.isArray(allClients) && allClients.length > 0) {
          list = allClients;
        }
      } catch (err) {
        console.warn('⚠️ Fallback /api/clients/all na edição de contrato:', err);
      }

      if (list.length === 0) {
        try {
          const selectClients = await clientService.getClientsForSelect();
          if (Array.isArray(selectClients) && selectClients.length > 0) {
            list = selectClients;
          }
        } catch (err) {
          console.warn('⚠️ Fallback /api/clients/select na edição de contrato:', err);
        }
      }

      if (list.length === 0) {
        const clientsData = await clientService.getClients();
        list = Array.isArray(clientsData) ? clientsData : (clientsData?.content || []);
      }

      setClients(list);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de clientes.",
        variant: "destructive"
      });
    } finally {
      setLoadingClients(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.contractNumber || !formData.description || !formData.clientId || 
        !formData.startDate || formData.value <= 0) {
      toast({
        title: "Dados Incompletos",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      console.log('📝 Atualizando contrato:', formData);

      const updatedContract = await contractService.updateContract(formData.id, {
        contractNumber: formData.contractNumber,
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        value: formData.value,
        status: formData.status,
        clientId: formData.clientId,
        notes: contractTerms || formData.notes || undefined,
        contractOrigin: formData.contractOrigin,
        contractType: selectedTemplateKey === 'ARMADA' ? 'VIGILANCIA_PATRIMONIAL' : formData.contractType,
        responsibleCommercialId: formData.responsibleCommercialId,
        responsibleManagerId: formData.responsibleManagerId,
        monthlyValue: formData.monthlyValue,
        annualValue: formData.annualValue,
        adjustmentType: formData.adjustmentType,
        nextAdjustmentDate: formData.nextAdjustmentDate,
        autoRenewal: formData.autoRenewal,
        replacementTimeHours: formData.replacementTimeHours,
        maxAbsenceMinutes: formData.maxAbsenceMinutes,
        patrolFrequency: formData.patrolFrequency || undefined,
        reportsRequired: formData.reportsRequired || undefined,
        obligationsContractor: formData.obligationsContractor || undefined,
        obligationsContracted: formData.obligationsContracted || undefined,
        penalties: formData.penalties || undefined
      });

      console.log('✅ Contrato atualizado:', updatedContract);

      toast({
        title: "Sucesso!",
        description: `Contrato ${formData.contractNumber} atualizado com sucesso.`,
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('❌ Erro ao atualizar contrato:', error);
      const message = error.response?.data?.message || error.message || "Não foi possível atualizar o contrato.";
      toast({
        title: "Erro!",
        description: message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndGeneratePdf = async () => {
    if (!formData.contractNumber || !formData.description || !formData.clientId || 
        !formData.startDate || formData.value <= 0) {
      toast({
        title: "Dados Incompletos",
        description: "Por favor, preencha todos os campos obrigatórios antes de gerar.",
        variant: "destructive"
      });
      return;
    }

    setGeneratingPdf(true);
    try {
      await contractService.updateContract(formData.id, {
        contractNumber: formData.contractNumber,
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        value: formData.value,
        status: formData.status,
        clientId: formData.clientId,
        notes: contractTerms || formData.notes || undefined,
        contractOrigin: formData.contractOrigin,
        contractType: selectedTemplateKey === 'ARMADA' ? 'VIGILANCIA_PATRIMONIAL' : formData.contractType,
        responsibleCommercialId: formData.responsibleCommercialId,
        responsibleManagerId: formData.responsibleManagerId,
        monthlyValue: formData.monthlyValue,
        annualValue: formData.annualValue,
        adjustmentType: formData.adjustmentType,
        nextAdjustmentDate: formData.nextAdjustmentDate,
        autoRenewal: formData.autoRenewal,
        replacementTimeHours: formData.replacementTimeHours,
        maxAbsenceMinutes: formData.maxAbsenceMinutes,
        patrolFrequency: formData.patrolFrequency || undefined,
        reportsRequired: formData.reportsRequired || undefined,
        obligationsContractor: formData.obligationsContractor || undefined,
        obligationsContracted: formData.obligationsContracted || undefined,
        penalties: formData.penalties || undefined
      });

      const client = clients.find(c => c.id === formData.clientId);
      const linkedPosts = await workPostService.getWorkPostsByContract(formData.id);

      const contractPayload = {
        companyId: selectedCompanyId || undefined,
        contractTemplateKey: selectedTemplateKey,
        representativeName: representativeName || undefined,
        representativeCpf: representativeCpf || undefined,
        additionalTerms: contractTerms || undefined,
        headerText: headerText || undefined,
        footerText: footerText || undefined,
        contractNumber: formData.contractNumber,
        clientName: client?.name || contract?.clientName || '',
        clientDocument: client?.cnpj || '',
        clientAddress: [client?.address, client?.city, client?.state].filter(Boolean).join(', '),
        clientPhone: client?.phone || client?.mobile || '',
        clientEmail: client?.email || '',
        description: formData.description,
        value: formData.value,
        startDate: formData.startDate,
        endDate: formData.endDate || '',
        paymentTerms: 'Pagamento mensal até o dia 10 de cada mês',
        observations: contractTerms || formData.notes || '',
        workPostIds: linkedPosts.map(p => p.id),
        workPosts: linkedPosts.map(p => ({
          name: p.name,
          postCode: p.postCode,
          type: p.type,
          city: p.city,
          state: p.state,
          workSchedule: p.workSchedule,
          shiftStart: p.shiftStart,
          shiftEnd: p.shiftEnd
        }))
      };

      const pdfBlob = await contractService.generateContractPdf(contractPayload);
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `contrato_${formData.contractNumber || 'atualizado'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Sucesso!",
        description: `Contrato atualizado e novo PDF gerado com sucesso!`,
      });

      onSuccess();
    } catch (err: any) {
      console.error('Erro ao salvar e gerar PDF:', err);
      toast({
        title: "Erro ao gerar PDF",
        description: err.message || "Não foi possível gerar o PDF do contrato.",
        variant: "destructive"
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      contractNumber: '',
      description: '',
      startDate: '',
      endDate: '',
      value: 0,
      status: 'DRAFT',
      clientId: '',
      notes: '',
      contractOrigin: 'MANUAL',
      contractType: 'VIGILANCIA_PATRIMONIAL',
      responsibleCommercialId: undefined,
      responsibleManagerId: undefined,
      monthlyValue: undefined,
      annualValue: undefined,
      adjustmentType: undefined,
      nextAdjustmentDate: undefined,
      autoRenewal: false,
      replacementTimeHours: undefined,
      maxAbsenceMinutes: undefined,
      patrolFrequency: '',
      reportsRequired: '',
      obligationsContractor: '',
      obligationsContracted: '',
      penalties: ''
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  if (!contract) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-seguranca-graphite border-gray-600 max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-seguranca-lightgray flex items-center justify-between">
            <span>Editar Contrato - {contract.contractNumber}</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="bg-seguranca-black border border-gray-600 flex flex-wrap h-auto p-1 gap-1">
            <TabsTrigger value="dados" className="data-[state=active]:bg-seguranca-graphite">Dados</TabsTrigger>
            <TabsTrigger value="minuta" className="data-[state=active]:bg-seguranca-graphite">
              <ScrollText className="h-4 w-4 mr-1" />
              Minuta & Cláusulas
            </TabsTrigger>
            <TabsTrigger value="aditivos" className="data-[state=active]:bg-seguranca-graphite">
              <FileText className="h-4 w-4 mr-1" />
              Aditivos
            </TabsTrigger>
            <TabsTrigger value="reajustes" className="data-[state=active]:bg-seguranca-graphite">
              <TrendingUp className="h-4 w-4 mr-1" />
              Reajustes
            </TabsTrigger>
            <TabsTrigger value="postos" className="data-[state=active]:bg-seguranca-graphite">
              <MapPin className="h-4 w-4 mr-1" />
              Postos
            </TabsTrigger>
            <TabsTrigger value="documentos" className="data-[state=active]:bg-seguranca-graphite">
              <FolderOpen className="h-4 w-4 mr-1" />
              Documentos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Filial Executora & Modelo da Minuta (Configuração da Empresa) */}
          <div className="p-4 rounded-xl border border-gray-600/80 bg-seguranca-black/60 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-seguranca-yellow flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Filial Contratada & Modelo da Minuta (Configuração da Empresa)
              </h3>
              {loadingCompanyConfig && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin text-seguranca-yellow" />
                  Carregando configurações...
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-seguranca-lightgray uppercase tracking-wider font-semibold">
                  Empresa Executora (Cabeçalho, Rodapé e Cláusulas) *
                </Label>
                {loadingCompanies ? (
                  <div className="flex items-center gap-2 p-2 bg-seguranca-black border border-gray-600 rounded mt-1">
                    <Loader2 className="h-4 w-4 animate-spin text-seguranca-yellow" />
                    <span className="text-xs text-seguranca-lightgray">Carregando empresas...</span>
                  </div>
                ) : (
                  <Select
                    value={selectedCompanyId}
                    onValueChange={(val) => handleCompanyChange(val)}
                  >
                    <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray mt-1">
                      <SelectValue placeholder="Selecione a empresa executora" />
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-graphite border-gray-600">
                      {companies.map(comp => (
                        <SelectItem key={comp.id} value={comp.id}>
                          {comp.name || comp.razaoSocial} ({comp.sigla || 'EMP'}) - {comp.cnpj || 'Sem CNPJ'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <Label className="text-xs text-seguranca-lightgray uppercase tracking-wider font-semibold">
                  Modelo do Contrato (Minuta Oficial) *
                </Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {allowedTemplateKeys.map(key => (
                    <Button
                      key={key}
                      type="button"
                      size="sm"
                      variant={selectedTemplateKey === key ? 'default' : 'outline'}
                      onClick={() => setSelectedTemplateKey(key)}
                      className={selectedTemplateKey === key
                        ? 'bg-seguranca-yellow text-black font-semibold hover:bg-amber-400'
                        : 'border-gray-600 text-gray-300 hover:bg-zinc-800'
                      }
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      {CONTRACT_TEMPLATE_LABELS[key] || key}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-seguranca-lightgray">
              Informações Básicas
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-seguranca-lightgray">Número do Contrato *</Label>
                <Input
                  value={formData.contractNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, contractNumber: e.target.value }))}
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                  required
                />
              </div>
              
              <div>
                <Label className="text-seguranca-lightgray">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-graphite border-gray-600">
                    <SelectItem value="DRAFT">Em elaboração</SelectItem>
                    <SelectItem value="ACTIVE">Ativo</SelectItem>
                    <SelectItem value="PENDING">Pendente</SelectItem>
                    <SelectItem value="INACTIVE">Inativo</SelectItem>
                    <SelectItem value="TERMINATED">Terminado</SelectItem>
                    <SelectItem value="EXPIRED">Expirado</SelectItem>
                    <SelectItem value="SUSPENDED">Suspenso</SelectItem>
                    <SelectItem value="CANCELLED">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-seguranca-lightgray">Cliente *</Label>
              {loadingClients ? (
                <div className="flex items-center gap-2 p-2 bg-seguranca-black border border-gray-600 rounded">
                  <Loader2 className="h-4 w-4 animate-spin text-seguranca-yellow" />
                  <span className="text-seguranca-lightgray">Carregando clientes...</span>
                </div>
              ) : (
                <Select
                  value={formData.clientId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: value }))}
                  required
                >
                  <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-graphite border-gray-600">
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} - {client.cnpj || 'Sem CNPJ'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Representante Legal do Cliente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-seguranca-lightgray">Representante Legal do Cliente (Signatário)</Label>
                <Input
                  value={representativeName}
                  onChange={(e) => setRepresentativeName(e.target.value)}
                  placeholder="Nome do representante legal"
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                />
              </div>
              <div>
                <Label className="text-seguranca-lightgray">CPF do Representante</Label>
                <Input
                  value={representativeCpf}
                  onChange={(e) => setRepresentativeCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                />
              </div>
            </div>

            <div>
              <Label className="text-seguranca-lightgray">Descrição *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                rows={3}
                required
              />
            </div>
          </div>

          {/* Valores e Datas */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-seguranca-lightgray">
              Valores e Período
            </h3>
            
            <div>
              <Label className="text-seguranca-lightgray">Valor do Contrato (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-seguranca-lightgray">Data de Início *</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                  required
                />
              </div>
              
              <div>
                <Label className="text-seguranca-lightgray">Data de Término</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                />
              </div>
            </div>
          </div>

          {/* Observações */}
          <div>
            <Label className="text-seguranca-lightgray">Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
              rows={3}
              placeholder="Observações adicionais sobre o contrato..."
            />
          </div>

          {/* SLA e Obrigações */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-seguranca-lightgray">SLA e Obrigações</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-seguranca-lightgray">Tempo de substituição (horas)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.replacementTimeHours ?? ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, replacementTimeHours: e.target.value ? parseInt(e.target.value, 10) : undefined }))}
                  className="bg-seguranca-black border-gray-600"
                />
              </div>
              <div>
                <Label className="text-seguranca-lightgray">Ausência máxima (minutos)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.maxAbsenceMinutes ?? ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxAbsenceMinutes: e.target.value ? parseInt(e.target.value, 10) : undefined }))}
                  className="bg-seguranca-black border-gray-600"
                />
              </div>
            </div>
            <div>
              <Label className="text-seguranca-lightgray">Frequência de rondas</Label>
              <Input
                value={formData.patrolFrequency}
                onChange={(e) => setFormData(prev => ({ ...prev, patrolFrequency: e.target.value }))}
                className="bg-seguranca-black border-gray-600"
                placeholder="Ex: 2h, 4h"
              />
            </div>
            <div>
              <Label className="text-seguranca-lightgray">Relatórios obrigatórios</Label>
              <Textarea
                value={formData.reportsRequired}
                onChange={(e) => setFormData(prev => ({ ...prev, reportsRequired: e.target.value }))}
                className="bg-seguranca-black border-gray-600"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-seguranca-lightgray">Obrigações do contratado</Label>
              <Textarea
                value={formData.obligationsContractor}
                onChange={(e) => setFormData(prev => ({ ...prev, obligationsContractor: e.target.value }))}
                className="bg-seguranca-black border-gray-600"
                rows={3}
              />
            </div>
            <div>
              <Label className="text-seguranca-lightgray">Obrigações do contratante</Label>
              <Textarea
                value={formData.obligationsContracted}
                onChange={(e) => setFormData(prev => ({ ...prev, obligationsContracted: e.target.value }))}
                className="bg-seguranca-black border-gray-600"
                rows={3}
              />
            </div>
            <div>
              <Label className="text-seguranca-lightgray">Penalidades</Label>
              <Textarea
                value={formData.penalties}
                onChange={(e) => setFormData(prev => ({ ...prev, penalties: e.target.value }))}
                className="bg-seguranca-black border-gray-600"
                rows={2}
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading || generatingPdf}
              className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={loading || generatingPdf}
              onClick={handleSaveAndGeneratePdf}
              className="border-emerald-600/60 text-emerald-400 hover:bg-emerald-950/30"
              title="Salva todas as alterações e faz o download imediato do novo PDF do contrato"
            >
              {generatingPdf ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Salvar e Gerar Novamente (PDF)
                </>
              )}
            </Button>
            
            <Button
              type="submit"
              disabled={loading || generatingPdf}
              className="bg-seguranca-red hover:bg-seguranca-darkred text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </form>
          </TabsContent>

          <TabsContent value="minuta" className="space-y-4">
            <div className="p-4 rounded-xl border border-gray-600/80 bg-seguranca-black/60 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-700 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-seguranca-lightgray flex items-center gap-2">
                    <ScrollText className="h-5 w-5 text-seguranca-yellow" />
                    Template do Contrato & Cláusulas Personalizadas
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Ajuste o cabeçalho, rodapé e as cláusulas específicas que constarão na minuta oficial deste contrato.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReloadCompanyClauses}
                  disabled={loadingCompanyConfig}
                  className="border-seguranca-yellow/50 text-seguranca-yellow hover:bg-seguranca-yellow hover:text-black text-xs self-start sm:self-auto"
                >
                  {loadingCompanyConfig ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Restaurar Cláusulas da Empresa
                </Button>
              </div>

              <div>
                <Label className="text-xs text-seguranca-lightgray uppercase tracking-wider font-semibold">
                  Título do Cabeçalho do Contrato
                </Label>
                <Input
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  placeholder="Ex: CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE SEGURANÇA"
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray mt-1"
                />
              </div>

              <div>
                <Label className="text-xs text-seguranca-lightgray uppercase tracking-wider font-semibold">
                  Texto do Rodapé do Contrato (Foro e Legislação)
                </Label>
                <Textarea
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="Texto do rodapé com foro e referências legais..."
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray mt-1"
                  rows={2}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs text-seguranca-lightgray uppercase tracking-wider font-semibold">
                    Cláusulas e Condições do Contrato
                  </Label>
                  <span className="text-[11px] text-gray-400">
                    Edite livremente ou restaure os termos da empresa selecionada
                  </span>
                </div>
                <Textarea
                  value={contractTerms}
                  onChange={(e) => setContractTerms(e.target.value)}
                  placeholder="Cláusulas e condições específicas deste contrato..."
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray font-mono text-xs leading-relaxed"
                  rows={14}
                />
              </div>

              {/* Botões de ação rápida na aba de minuta */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-gray-700">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading || generatingPdf}
                  onClick={handleSaveAndGeneratePdf}
                  className="border-emerald-600/60 text-emerald-400 hover:bg-emerald-950/30"
                  title="Salva todas as alterações e faz o download imediato do novo PDF do contrato"
                >
                  {generatingPdf ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gerando PDF...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Salvar e Gerar Novamente (PDF)
                    </>
                  )}
                </Button>
                
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || generatingPdf}
                  className="bg-seguranca-red hover:bg-seguranca-darkred text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="aditivos">
            <ContractAmendmentsTab contractId={contract.id} onAmendmentApproved={onSuccess} />
          </TabsContent>

          <TabsContent value="reajustes">
            <ContractAdjustmentsTab
              contractId={contract.id}
              currentValue={formData.value}
              onAdjustmentCreated={onSuccess}
            />
          </TabsContent>

          <TabsContent value="postos">
            <ContractPostosTab
              contractId={contract.id}
              clientId={formData.clientId || contract.clientId || ''}
              clientName={contract?.clientName || ''}
              onPostosChange={onSuccess}
            />
          </TabsContent>

          <TabsContent value="documentos">
            <ContractDocumentsTab contractId={contract.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
