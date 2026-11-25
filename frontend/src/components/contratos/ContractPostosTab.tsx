import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { workPostService, WorkPost } from '@/services/workPostService';
import { isUuid } from '@/utils/uuid';
import { Loader2, Plus, MapPin, Unlink, Search, CheckCircle2, Building, RefreshCw, X } from 'lucide-react';
import WorkPostFormModal from '@/components/postos/WorkPostFormModal';

interface ContractPostosTabProps {
  contractId: string;
  clientId: string;
  clientName?: string;
  onPostosChange?: () => void;
}

export const ContractPostosTab: React.FC<ContractPostosTabProps> = ({
  contractId,
  clientId,
  clientName,
  onPostosChange
}) => {
  const { toast } = useToast();
  const [linkedPostos, setLinkedPostos] = useState<WorkPost[]>([]);
  const [clientPostos, setClientPostos] = useState<WorkPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClientPostos, setLoadingClientPostos] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [linkingAll, setLinkingAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);

  const loadLinked = async () => {
    if (!isUuid(contractId)) return;
    setLoading(true);
    try {
      const data = await workPostService.getWorkPostsByContract(contractId);
      setLinkedPostos(Array.isArray(data) ? data : []);
    } catch {
      setLinkedPostos([]);
    } finally {
      setLoading(false);
    }
  };

  const loadClientPostos = async () => {
    if (!clientId) return;
    setLoadingClientPostos(true);
    try {
      let data: WorkPost[] = [];
      if (isUuid(clientId)) {
        try {
          const res = await workPostService.getWorkPostsByClient(clientId);
          if (Array.isArray(res)) data = res;
        } catch (e) {
          console.warn('Falha em getWorkPostsByClient, buscando geral:', e);
        }
      }

      // Se a busca por clientId retornou poucos ou nenhum item, buscar de todos os postos
      const allPosts = await workPostService.getAllWorkPosts();
      if (Array.isArray(allPosts)) {
        const normClientName = (clientName || '').trim().toLowerCase();
        const mergedMap = new Map<string, WorkPost>();
        
        data.forEach(p => { if (p.id) mergedMap.set(p.id, p); });
        
        allPosts.forEach(p => {
          if (!p.id) return;
          const matchId = p.clientId && p.clientId === clientId;
          const matchName = normClientName && p.clientName && p.clientName.trim().toLowerCase() === normClientName;
          if (matchId || matchName) {
            mergedMap.set(p.id, p);
          }
        });

        data = Array.from(mergedMap.values());
      }

      setClientPostos(data);
    } catch (err) {
      console.error('Erro ao carregar postos do cliente:', err);
      setClientPostos([]);
    } finally {
      setLoadingClientPostos(false);
    }
  };

  useEffect(() => {
    loadLinked();
  }, [contractId]);

  useEffect(() => {
    loadClientPostos();
  }, [clientId, clientName]);

  // IDs que já estão vinculados
  const linkedIds = useMemo(() => new Set(linkedPostos.map(p => p.id)), [linkedPostos]);

  // Postos do cliente candidatos a vincular (que ainda não constam como vinculados)
  const availableToLink = useMemo(() => {
    return clientPostos.filter(p => !linkedIds.has(p.id));
  }, [clientPostos, linkedIds]);

  // Postos filtrados pela barra de busca
  const filteredAvailablePostos = useMemo(() => {
    if (!searchTerm.trim()) return availableToLink;
    const term = searchTerm.toLowerCase();
    return availableToLink.filter(p => {
      const code = (p.postCode || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      const city = (p.city || '').toLowerCase();
      const status = (p.status || '').toLowerCase();
      const sched = (p.workSchedule || '').toLowerCase();
      return code.includes(term) || name.includes(term) || city.includes(term) || status.includes(term) || sched.includes(term);
    });
  }, [availableToLink, searchTerm]);

  const handleLink = async (workPostId: string) => {
    setLinkingId(workPostId);
    try {
      await workPostService.setWorkPostContract(workPostId, contractId);
      toast({ title: 'Sucesso', description: 'Posto vinculado ao contrato com sucesso!' });
      await loadLinked();
      await loadClientPostos();
      onPostosChange?.();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Não foi possível vincular o posto.',
        variant: 'destructive'
      });
    } finally {
      setLinkingId(null);
    }
  };

  const handleLinkAllFiltered = async () => {
    if (filteredAvailablePostos.length === 0) return;
    setLinkingAll(true);
    let successCount = 0;
    try {
      for (const p of filteredAvailablePostos) {
        if (!p.id) continue;
        try {
          await workPostService.setWorkPostContract(p.id, contractId);
          successCount++;
        } catch (e) {
          console.error('Erro ao vincular posto ' + p.id, e);
        }
      }
      toast({
        title: 'Vinculação Concluída',
        description: `${successCount} posto(s) vinculado(s) ao contrato.`
      });
      await loadLinked();
      await loadClientPostos();
      onPostosChange?.();
    } finally {
      setLinkingAll(false);
    }
  };

  const handleUnlink = async (workPostId: string) => {
    try {
      await workPostService.setWorkPostContract(workPostId, null);
      toast({ title: 'Sucesso', description: 'Posto desvinculado do contrato.' });
      await loadLinked();
      await loadClientPostos();
      onPostosChange?.();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Não foi possível desvincular o posto.',
        variant: 'destructive'
      });
    }
  };

  if (!clientId) {
    return (
      <div className="py-6 text-center text-seguranca-lightgray">
        Salve o contrato com um cliente selecionado para gerenciar os postos aqui.
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-700/60 pb-4">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Building className="h-5 w-5 text-seguranca-red" />
            Postos de Serviço do Cliente
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Vincule os postos (novos ou já cadastrados) para compor este contrato de prestação de serviços.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              loadLinked();
              loadClientPostos();
            }}
            disabled={loading || loadingClientPostos}
            className="border-gray-600 text-gray-300 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loadingClientPostos ? 'animate-spin' : ''}`} />
            Atualizar Postos
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setIsNewPostModalOpen(true)}
            className="bg-seguranca-red hover:bg-seguranca-darkred text-white gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Cadastrar Novo Posto
          </Button>
        </div>
      </div>

      {/* Seção 1: Postos Vinculados ao Contrato */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-seguranca-yellow flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Postos Vinculados a este Contrato ({linkedPostos.length})
          </span>
          {linkedPostos.length === 0 && (
            <Badge variant="outline" className="text-amber-400 border-amber-500/40 text-xs">
              Mínimo 1 posto necessário para ativar
            </Badge>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-seguranca-yellow" />
            <span className="ml-2 text-xs text-gray-400">Carregando postos vinculados...</span>
          </div>
        ) : linkedPostos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-600 bg-seguranca-black/40 p-6 text-center text-gray-400">
            <MapPin className="mx-auto h-8 w-8 mb-2 opacity-50 text-gray-500" />
            <p className="text-sm font-medium">Nenhum posto vinculado a este contrato.</p>
            <p className="text-xs text-gray-500 mt-1">
              Use a lista de postos disponíveis abaixo para vincular os postos de serviço desejados.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {linkedPostos.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-950/10 p-3 text-seguranca-lightgray hover:border-emerald-500/50 transition-all"
              >
                <div className="space-y-1 overflow-hidden pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-seguranca-yellow shrink-0">
                      {p.postCode || 'POSTO'}
                    </span>
                    <span className="text-sm font-medium text-white truncate" title={p.name}>
                      {p.name}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-400">
                    {p.city && <span>{p.city}{p.state ? ` - ${p.state}` : ''}</span>}
                    {p.workSchedule && <span>• Escala: {p.workSchedule}</span>}
                    {p.status && (
                      <Badge className={`text-[10px] py-0 px-1.5 ${p.status === 'ATIVO' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                        {p.status.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUnlink(p.id!)}
                  className="text-gray-400 hover:text-red-400 hover:bg-red-950/30 shrink-0 h-8 w-8 p-0"
                  title="Desvincular posto deste contrato"
                >
                  <Unlink className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seção 2: Postos Disponíveis para Vincular com Pesquisa */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-seguranca-black/60 p-3 rounded-lg border border-gray-700">
          <div>
            <span className="text-sm font-semibold text-white">
              Vincular Postos Disponíveis ({availableToLink.length})
            </span>
            <p className="text-xs text-gray-400">
              Selecione os postos do cliente que deseja associar a este contrato.
            </p>
          </div>

          {filteredAvailablePostos.length > 1 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLinkAllFiltered}
              disabled={linkingAll}
              className="border-emerald-600/50 text-emerald-400 hover:bg-emerald-950/30 text-xs shrink-0"
            >
              {linkingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
              Vincular Todos os Filtrados ({filteredAvailablePostos.length})
            </Button>
          )}
        </div>

        {/* Campo de Pesquisa dos Postos */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <Input
            placeholder="Pesquisar postos do cliente por código, nome, cidade ou escala..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-9 py-2 bg-seguranca-black/70 border-gray-600 text-white placeholder-gray-400 text-xs sm:text-sm rounded-lg"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Lista de Postos Candidatos com Botão Direto de Vincular */}
        {loadingClientPostos ? (
          <div className="flex items-center justify-center py-6 text-xs text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin text-seguranca-red mr-2" />
            Buscando postos cadastrados para este cliente...
          </div>
        ) : availableToLink.length === 0 ? (
          <div className="rounded-lg border border-gray-700 bg-seguranca-black/30 p-4 text-center text-xs text-gray-400">
            {clientPostos.length === 0
              ? 'Nenhum posto de trabalho encontrado para este cliente. Use o botão acima "Cadastrar Novo Posto" para criar um agora.'
              : 'Todos os postos cadastrados deste cliente já estão vinculados a este contrato.'}
          </div>
        ) : filteredAvailablePostos.length === 0 ? (
          <div className="rounded-lg border border-gray-700 bg-seguranca-black/30 p-4 text-center text-xs text-gray-400">
            Nenhum posto encontrado para o termo &quot;{searchTerm}&quot;. Tente outro filtro.
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredAvailablePostos.map((p) => {
              const isLinkingThis = linkingId === p.id;
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-gray-700/80 bg-seguranca-black/40 p-2.5 hover:border-gray-500 transition-all text-xs"
                >
                  <div className="space-y-0.5 overflow-hidden pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-seguranca-yellow">
                        {p.postCode || 'POSTO'}
                      </span>
                      <span className="font-medium text-white truncate" title={p.name}>
                        {p.name}
                      </span>
                      {p.status && (
                        <Badge className={`text-[9px] py-0 px-1.5 ${p.status === 'ATIVO' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                          {p.status.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-400 flex flex-wrap gap-2">
                      {p.city && <span>📍 {p.city}{p.state ? `/${p.state}` : ''}</span>}
                      {p.workSchedule && <span>🕒 {p.workSchedule}</span>}
                      {p.type && <span>💼 {p.type.replace(/^POSTO_/, '')}</span>}
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleLink(p.id!)}
                    disabled={isLinkingThis || linkingAll}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-3 gap-1 shrink-0"
                  >
                    {isLinkingThis ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    Vincular
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal para cadastrar novo posto de serviço diretamente aqui */}
      {isNewPostModalOpen && (
        <WorkPostFormModal
          open={isNewPostModalOpen}
          onOpenChange={setIsNewPostModalOpen}
          workPost={null}
          clients={[]}
          onSubmit={() => {
            setIsNewPostModalOpen(false);
            loadClientPostos();
          }}
          forcedClientId={clientId}
        />
      )}
    </div>
  );
};

export default ContractPostosTab;
