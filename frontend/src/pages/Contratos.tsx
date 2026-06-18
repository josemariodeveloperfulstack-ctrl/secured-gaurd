import React, { useState, useEffect } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ContratosTable } from '@/components/contratos/ContratosTable';
import { ContratosCards } from '@/components/contratos/ContratosCards';
import { ContratoFormModal } from '@/components/contratos/ContratoFormModal';
import { ContractsDashboard } from '@/components/contratos/ContractsDashboard';
import { ContractsFilters } from '@/components/contratos/ContractsFilters';
import { ContractGenerator } from '@/components/contratos/ContractGenerator';
import { CompanySettings } from '@/components/contratos/CompanySettings';
import { EditContractModal } from '@/components/contratos/EditContractModal';
import { ExpiringAlertsWidget } from '@/components/contratos/ExpiringAlertsWidget';
import { RenewContractModal } from '@/components/contratos/RenewContractModal';
import { TerminateContractModal } from '@/components/contratos/TerminateContractModal';
import DepartamentosEmailConfig from '@/components/comercial/DepartamentosEmailConfig';
import { useToast } from '@/hooks/use-toast';
import { notificationService } from '@/services/notificationService';
import { contractService, Contract, ContractFilters } from '@/services/contractService';
import { isUuid } from '@/utils/uuid';
import { Plus, Search, Settings, Loader2, AlertCircle, RefreshCw, FileText, Building } from 'lucide-react';

const Contratos = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [originFilter, setOriginFilter] = useState('all');
  const [expiringFilter, setExpiringFilter] = useState('all');
  const [contratos, setContratos] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [generatorModalOpen, setGeneratorModalOpen] = useState(false);
  const [companySettingsOpen, setCompanySettingsOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedContractForGeneration, setSelectedContractForGeneration] = useState<Contract | null>(null);
  const [selectedContractForEdit, setSelectedContractForEdit] = useState<Contract | null>(null);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [contractToRenew, setContractToRenew] = useState<{ id: string; number: string; value: number } | null>(null);
  const [terminateModalOpen, setTerminateModalOpen] = useState(false);
  const [contractToTerminate, setContractToTerminate] = useState<Contract | null>(null);

  // Carregar contratos
  const loadContracts = async (filters: ContractFilters = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Carregando contratos com filtros:', filters);
      const data = await contractService.getContracts(filters);
      console.log('📋 Contratos recebidos:', data);
      console.log('📊 Quantidade de contratos:', data?.length || 0);
      
      // Validar dados recebidos
      if (data && Array.isArray(data)) {
        const validContracts = data.filter(contract => {
          if (!contract || !contract.clientName) {
            console.warn('⚠️ Contrato recebido sem dados do cliente:', contract);
            return false;
          }
          if (!isUuid(String(contract.id))) {
            console.warn('⚠️ Contrato ignorado — ID inválido (dados mock/stale):', contract.id);
            return false;
          }
          return true;
        });
        
        console.log('✅ Contratos válidos:', validContracts.length);
        setContratos(validContracts);
      } else {
        console.warn('⚠️ Dados recebidos não são um array válido:', data);
        setContratos([]);
      }
    } catch (err) {
      console.error('❌ Erro ao carregar contratos:', err);
      setError('Erro ao carregar contratos. Tente novamente.');
      setContratos([]);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os contratos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Carregar contratos com filtros
  const loadContractsWithFilters = async () => {
    const filters: ContractFilters = {};
    
    if (searchTerm) {
      filters.searchTerm = searchTerm;
    }
    
    await loadContracts(filters);
  };

  // Carregar contratos iniciais
  useEffect(() => {
    loadContracts();
  }, []);

  // Aplicar filtros quando mudarem
  useEffect(() => {
    if (!loading) {
      loadContractsWithFilters();
    }
  }, [searchTerm]);

  const normalizeStatus = (status: unknown) =>
    String(status ?? '').toUpperCase().trim();

  // Filtrar contratos localmente
  const filteredContratos = contratos.filter((contrato) => {
    if (!contrato?.id) return false;

    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      term.length === 0 ||
      (contrato.clientName?.toLowerCase().includes(term) ?? false) ||
      (contrato.contractNumber?.toLowerCase().includes(term) ?? false) ||
      (contrato.description?.toLowerCase().includes(term) ?? false);

    const st = normalizeStatus(contrato.status);
    const matchesStatus =
      statusFilter === 'all' ||
      st === statusFilter ||
      (statusFilter === 'AWAITING' && (st === 'PENDING' || st === 'DRAFT')) ||
      (statusFilter === 'TERMINATED' &&
        (st === 'CANCELLED' || st === 'EXPIRED' || st === 'TERMINATED'));

    const matchesOrigin =
      originFilter === 'all' || contrato.contractOrigin === originFilter;

    const matchesExpiring =
      expiringFilter === 'all' ||
      (() => {
        if (!contrato.endDate || expiringFilter !== '30') return false;
        const end = new Date(contrato.endDate);
        const daysUntil = Math.ceil(
          (end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        return daysUntil >= 0 && daysUntil <= 30;
      })();

    return matchesSearch && matchesStatus && matchesOrigin && matchesExpiring;
  });

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    if (status !== 'all') setExpiringFilter('all');
  };

  const handleExpiringFilterChange = (days: string) => {
    setExpiringFilter(days);
    if (days !== 'all') setStatusFilter('all');
  };

  // Limpar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setOriginFilter('all');
    setExpiringFilter('all');
    loadContracts();
  };

  // Atualizar status do contrato
  const updateContractStatus = async (contractId: string, newStatus: string) => {
    try {
      await contractService.updateContractStatus(contractId, newStatus);
      toast({
        title: "Sucesso",
        description: "Status do contrato atualizado com sucesso.",
      });
      loadContractsWithFilters(); // Recarregar lista
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do contrato.",
        variant: "destructive"
      });
    }
  };

  // Excluir contrato
  const deleteContract = async (contractId: string) => {
    if (!confirm('Tem certeza que deseja excluir este contrato?')) {
      return;
    }

    try {
      await contractService.deleteContract(contractId);
      toast({
        title: "Sucesso",
        description: "Contrato excluído com sucesso.",
      });
      loadContractsWithFilters(); // Recarregar lista
    } catch (err) {
      console.error('Erro ao excluir contrato:', err);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o contrato.",
        variant: "destructive"
      });
    }
  };

  const handleEditContrato = (contrato: Contract) => {
    if (!isUuid(String(contrato.id))) {
      toast({
        title: 'Contrato inválido',
        description: 'Este contrato usa um ID obsoleto. Recarregue a página para atualizar a lista.',
        variant: 'destructive',
      });
      return;
    }
    console.log('🖊️ Editando contrato:', contrato);
    setSelectedContractForEdit(contrato);
    setEditModalOpen(true);
  };

  const handleDeleteSuccess = () => {
    console.log('Contrato deletado com sucesso');
    loadContractsWithFilters(); // Recarregar lista
  };

  const handleEditSuccess = () => {
    console.log('Contrato editado com sucesso');
    loadContractsWithFilters(); // Só atualiza a lista; modal permanece aberto na mesma aba
  };

  const handleEditModalOpenChange = (open: boolean) => {
    setEditModalOpen(open);
    if (!open) setSelectedContractForEdit(null); // Limpa seleção apenas ao fechar o modal
  };

  const handleTerminateClick = (contrato: Contract) => {
    setContractToTerminate(contrato);
    setTerminateModalOpen(true);
  };

  const handleRenewClick = (contractId: string, contractNumber?: string, value?: number) => {
    const c = contratos.find(x => x.id === contractId);
    setContractToRenew({
      id: contractId,
      number: contractNumber || c?.contractNumber || '',
      value: value ?? c?.value ?? 0
    });
    setRenewModalOpen(true);
  };

  const handleGenerateContract = (contract?: Contract) => {
    setSelectedContractForGeneration(contract || null);
    setGeneratorModalOpen(true);
  };

  const handleCompanySettings = () => {
    setGeneratorModalOpen(false); // Fecha o modal de gerar contrato para exibir as configurações
    setCompanySettingsOpen(true);
  };

  const handleSaveCompanyConfig = (config: any) => {
    console.log('Configurações da empresa salvas:', config);
    // As configurações são salvas no localStorage pelo componente
  };

  const handleAddContrato = async (contractData: any) => {
    try {
      console.log('📥 Dados recebidos do modal:', contractData);
      
      // Os dados já vêm no formato correto do modal atualizado
      const createdContract = await contractService.createContract(contractData);
      
      console.log('✅ Contrato criado:', createdContract);
      
      // TODO: Implementar notificações via backend service
      // As notificações agora são tratadas pelo backend automaticamente
      
      toast({
        title: 'Contrato Criado!',
        description: `Contrato ${contractData.contractNumber} criado com sucesso.`,
      });
      
      setModalOpen(false);
      loadContractsWithFilters(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao criar contrato:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o contrato.',
        variant: 'destructive',
      });
    }
  };

  const handleModalSuccess = () => {
    setModalOpen(false);
  };

  // Loading state
  if (loading && contratos.length === 0) {
    return (
      <StandardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-seguranca-red mb-4" />
            <p className="text-seguranca-lightgray">Carregando contratos...</p>
          </div>
        </div>
      </StandardLayout>
    );
  }

  // Error state
  if (error && contratos.length === 0) {
    return (
      <StandardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-4" />
            <p className="text-seguranca-lightgray mb-4">{error}</p>
            <Button 
              onClick={() => loadContracts()}
              className="bg-seguranca-red hover:bg-seguranca-darkred"
            >
              Tentar Novamente
            </Button>
          </div>
        </div>
      </StandardLayout>
    );
  }

  const handleRefresh = () => {
    setRefreshing(true);
    loadContractsWithFilters().finally(() => setTimeout(() => setRefreshing(false), 600));
  };

  return (
    <StandardLayout>
      <div className="space-y-5 sm:space-y-6 w-full max-w-full overflow-x-hidden px-3 sm:px-4 lg:px-6 pb-8">
        {/* Cabeçalho */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-seguranca-lightgray tracking-tight">
              Contratos
            </h1>
            <p className="text-sm text-gray-400 mt-1 max-w-xl">
              Gerencie contratos, acompanhe vencimentos e filtre por status com um clique nos indicadores.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto lg:min-w-[280px]">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Buscar por cliente, número ou descrição…"
                className="pl-10 h-10 bg-seguranca-black border-gray-600 text-seguranca-lightgray focus-visible:ring-seguranca-yellow"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              onClick={() => setModalOpen(true)}
              className="bg-seguranca-red hover:bg-seguranca-darkred h-10 flex-shrink-0 whitespace-nowrap shadow-md shadow-seguranca-red/20"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo contrato
            </Button>
          </div>
        </header>

        {/* Ações secundárias */}
        <div className="flex flex-wrap items-center gap-2 p-2 sm:p-3 rounded-xl bg-seguranca-graphite/80 border border-gray-600/60">
          <span className="text-[11px] uppercase tracking-wider text-gray-500 px-1 w-full sm:w-auto sm:mr-1">
            Ações
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCompanySettings}
            className="border-seguranca-yellow/50 text-seguranca-yellow hover:bg-seguranca-yellow hover:text-black h-8"
          >
            <Building className="h-3.5 w-3.5 mr-1.5" />
            Empresa
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGenerateContract()}
            className="border-emerald-600/50 text-emerald-400 hover:bg-emerald-600 hover:text-white h-8"
          >
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Gerar contrato
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfigModalOpen(true)}
            className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black h-8"
          >
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            E-mails
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black h-8 ml-auto sm:ml-0"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            )}
            Atualizar
          </Button>
        </div>

        {/* Dashboard + alertas */}
        {!loading && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_minmax(280px,340px)] gap-4 w-full items-start">
            <ContractsDashboard
              contracts={contratos}
              statusFilter={statusFilter}
              expiringFilter={expiringFilter}
              onStatusFilterChange={handleStatusFilterChange}
              onFocusExpiring={() => handleExpiringFilterChange('30')}
            />
            <ExpiringAlertsWidget onRenew={handleRenewClick} />
          </div>
        )}

        {/* Lista */}
        {!loading && (
          <ContractsFilters
            statusFilter={statusFilter}
            onStatusFilterChange={handleStatusFilterChange}
            originFilter={originFilter}
            onOriginFilterChange={setOriginFilter}
            expiringFilter={expiringFilter}
            onExpiringFilterChange={handleExpiringFilterChange}
            onClearFilters={clearFilters}
            onClearSearch={() => setSearchTerm('')}
            totalContracts={contratos.length}
            filteredContracts={filteredContratos.length}
            searchTerm={searchTerm}
          />
        )}

        {!loading && filteredContratos.length > 0 && (
          <h2 className="text-sm font-semibold uppercase tracking-wider text-seguranca-yellow">
            Contratos cadastrados
            <span className="ml-2 text-gray-500 font-normal normal-case tracking-normal text-xs">
              ({filteredContratos.length})
            </span>
          </h2>
        )}

        {!loading && (
          <ContratosCards
            contratos={filteredContratos}
            totalCount={contratos.length}
            onClearFilters={clearFilters}
            onEdit={handleEditContrato}
            onDelete={handleDeleteSuccess}
            onStatusChange={updateContractStatus}
            onGenerateContract={handleGenerateContract}
            onTerminate={handleTerminateClick}
          />
        )}


        {/* Modais */}
        <ContratoFormModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSubmit={handleAddContrato}
          onSuccess={handleModalSuccess}
        />

        <DepartamentosEmailConfig
          open={configModalOpen}
          onOpenChange={setConfigModalOpen}
        />

        {/* Modal de Geração de Contratos */}
        <ContractGenerator
          open={generatorModalOpen}
          onOpenChange={setGeneratorModalOpen}
          contract={selectedContractForGeneration}
          onConfigureCompany={handleCompanySettings}
        />

        {/* Modal de Configurações da Empresa */}
        {companySettingsOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
            <div className="bg-seguranca-graphite border border-gray-600 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-seguranca-lightgray">
                    Configurações da Empresa
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCompanySettingsOpen(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </Button>
                </div>
                
                <CompanySettings
                  open={companySettingsOpen}
                  onSave={handleSaveCompanyConfig}
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal de Edição de Contrato */}
        <EditContractModal
          open={editModalOpen}
          onOpenChange={handleEditModalOpenChange}
          contract={selectedContractForEdit}
          onSuccess={handleEditSuccess}
        />

        {/* Modal de Encerramento */}
        <TerminateContractModal
          open={terminateModalOpen}
          onOpenChange={setTerminateModalOpen}
          contractId={contractToTerminate?.id ?? null}
          contractNumber={contractToTerminate?.contractNumber}
          onSuccess={() => { loadContracts(); setContractToTerminate(null); }}
        />

        {/* Modal de Renovação */}
        <RenewContractModal
          open={renewModalOpen}
          onOpenChange={setRenewModalOpen}
          contractId={contractToRenew?.id ?? null}
          contractNumber={contractToRenew?.number}
          currentValue={contractToRenew?.value}
          onSuccess={() => { loadContracts(); setContractToRenew(null); }}
        />
      </div>
    </StandardLayout>
  );
};

export default Contratos; 