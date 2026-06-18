import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { workPostService, WorkPost } from '@/services/workPostService';
import { isUuid } from '@/utils/uuid';
import { Loader2, Plus, MapPin, Unlink } from 'lucide-react';

interface ContractPostosTabProps {
  contractId: string;
  clientId: string;
  onPostosChange?: () => void;
}

export const ContractPostosTab: React.FC<ContractPostosTabProps> = ({
  contractId,
  clientId,
  onPostosChange
}) => {
  const { toast } = useToast();
  const [linkedPostos, setLinkedPostos] = useState<WorkPost[]>([]);
  const [clientPostos, setClientPostos] = useState<WorkPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [selectedPostoToLink, setSelectedPostoToLink] = useState<string>('');

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
    if (!isUuid(clientId)) return;
    try {
      const data = await workPostService.getWorkPostsByClient(clientId);
      setClientPostos(Array.isArray(data) ? data : []);
    } catch {
      setClientPostos([]);
    }
  };

  useEffect(() => {
    loadLinked();
  }, [contractId]);

  useEffect(() => {
    loadClientPostos();
  }, [clientId]);

  // Postos do cliente que ainda não estão vinculados a este contrato (candidatos a vincular)
  const postosToLink = clientPostos.filter(
    (p) => p.contractId !== contractId && p.id
  );

  const handleLink = async () => {
    if (!selectedPostoToLink) {
      toast({ title: 'Selecione um posto', description: 'Escolha um posto para vincular ao contrato.', variant: 'destructive' });
      return;
    }
    setLinking(true);
    try {
      await workPostService.setWorkPostContract(selectedPostoToLink, contractId);
      toast({ title: 'Sucesso', description: 'Posto vinculado ao contrato.' });
      setSelectedPostoToLink('');
      loadLinked();
      loadClientPostos();
      onPostosChange?.();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Não foi possível vincular o posto.',
        variant: 'destructive'
      });
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (workPostId: string) => {
    try {
      await workPostService.setWorkPostContract(workPostId, null);
      toast({ title: 'Sucesso', description: 'Posto desvinculado do contrato.' });
      loadLinked();
      loadClientPostos();
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-lg font-medium text-seguranca-lightgray">Postos de serviço</h3>
        <div className="flex items-center gap-2">
          <Select value={selectedPostoToLink} onValueChange={setSelectedPostoToLink}>
            <SelectTrigger className="w-[220px] bg-seguranca-black border-gray-600 text-seguranca-lightgray">
              <SelectValue placeholder="Selecione um posto para vincular" />
            </SelectTrigger>
            <SelectContent className="bg-seguranca-graphite border-gray-600">
              {postosToLink.length === 0 ? (
                <div className="p-2 text-sm text-gray-400">
                  {clientPostos.length === 0 ? 'Nenhum posto do cliente.' : 'Todos os postos do cliente já estão vinculados.'}
                </div>
              ) : (
                postosToLink.map((p) => (
                  <SelectItem key={p.id} value={p.id!}>
                    {p.postCode || p.name} - {p.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            onClick={handleLink}
            disabled={!selectedPostoToLink || linking}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="ml-1">Vincular</span>
          </Button>
        </div>
      </div>

      <p className="text-sm text-gray-400">
        Para ativar o contrato, é necessário ter ao menos um posto vinculado. Vincule os postos aqui e depois altere o status para &quot;Ativo&quot; na aba Dados.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-seguranca-yellow" />
        </div>
      ) : linkedPostos.length === 0 ? (
        <div className="rounded-lg border border-gray-600 bg-seguranca-black/50 p-6 text-center text-gray-400">
          <MapPin className="mx-auto h-10 w-10 mb-2 opacity-50" />
          Nenhum posto vinculado a este contrato. Use o campo acima para vincular um posto do cliente.
        </div>
      ) : (
        <ul className="space-y-2">
          {linkedPostos.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-gray-600 bg-seguranca-black/50 p-3 text-seguranca-lightgray"
            >
              <div>
                <span className="font-medium">{p.postCode || p.name}</span>
                <span className="text-gray-400 ml-2">- {p.name}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleUnlink(p.id!)}
                className="text-gray-400 hover:text-red-400"
                title="Desvincular posto"
              >
                <Unlink className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
