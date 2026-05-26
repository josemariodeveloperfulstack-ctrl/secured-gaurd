import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Loader2, Sparkles, Building2, Clock, Shield, MapPin, Users } from 'lucide-react';
import { workPostService } from '@/services/workPostService';
import { useToast } from '@/hooks/use-toast';

const formatZipCode = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 5) {
    return numbers;
  } else {
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  }
};

interface WorkPostDrawerProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  onSuccess: (newPost: any) => void;
}

export const WorkPostDrawer: React.FC<WorkPostDrawerProps> = ({
  open,
  onClose,
  clientId,
  onSuccess
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [formData, setFormData] = useState({
    postCode: '',
    name: '',
    description: '',
    type: 'POSTO_24H',
    status: 'EM_IMPLANTACAO',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    requiredVigilantes: 1,
    workSchedule: '12x36',
    shiftStart: '07:00',
    shiftEnd: '19:00',
    shiftDescription: 'Turno Diurno'
  });

  if (!open) return null;

  const buscarCep = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    setLoadingCep(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cepLimpo}`);

      if (response.ok) {
        const data = await response.json();
        
        // Formatar endereço completo: "street, neighborhood"
        const enderecoCompleto = [data.street, data.neighborhood]
          .filter(Boolean)
          .join(', ');

        setFormData(prev => ({
          ...prev,
          address: enderecoCompleto || prev.address,
          city: data.city || prev.city,
          state: data.state || prev.state,
          zipCode: formatZipCode(cepLimpo)
        }));
        
        toast({
          title: "CEP Encontrado",
          description: "Os campos de endereço foram preenchidos automaticamente.",
        });
      } else {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP digitado e tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast({
        title: "Erro ao buscar CEP",
        description: "Não foi possível conectar ao serviço de busca de CEP.",
        variant: "destructive",
      });
    } finally {
      setLoadingCep(false);
    }
  };

  // Gerar código do posto automaticamente
  const generatePostCode = () => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const generated = `PST-${randomSuffix}`;
    setFormData(prev => ({ ...prev, postCode: generated }));
    toast({
      title: "Sucesso",
      description: `Código gerado: ${generated}`,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      toast({
        title: "Erro",
        description: "Associação de cliente inválida. Selecione o cliente no formulário principal primeiro.",
        variant: "destructive"
      });
      return;
    }
    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "O nome do posto é obrigatório.",
        variant: "destructive"
      });
      return;
    }
    if (!formData.address.trim()) {
      toast({
        title: "Erro",
        description: "O endereço do posto é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        postCode: formData.postCode || `PST-${Math.floor(100 + Math.random() * 900)}`,
        clientId,
        nrs: [] as string[],
        epis: [] as string[],
        trainings: [] as string[]
      };

      console.log('📤 Salvando posto de trabalho via API:', payload);
      const newPost = await workPostService.createWorkPost(payload);
      console.log('✅ Posto de trabalho salvo com sucesso:', newPost);

      toast({
        title: "Posto Criado!",
        description: `O posto "${newPost.name}" foi salvo permanentemente no banco de dados.`,
      });

      onSuccess(newPost);
      onClose();
    } catch (error: any) {
      console.error('❌ Erro ao criar posto de trabalho:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Não foi possível criar o posto de trabalho.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      {/* Overlay clicável para fechar */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Painel da Drawer (Cantos vivos brutalistas, bordas zinc-800, sem arredondamentos) */}
      <div className="relative w-full sm:w-[480px] h-full bg-[#121212] border-l-2 border-zinc-800 shadow-2xl flex flex-col text-white animate-in slide-in-from-right duration-250 select-none">
        
        {/* Header Brutalista */}
        <div className="p-4 border-b-2 border-zinc-800 bg-[#161616] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-yellow-500" />
            <h3 className="text-md font-bold uppercase tracking-wider text-yellow-500">Novo Posto de Trabalho</h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1 border border-zinc-700 hover:border-red-500 hover:bg-red-500 hover:text-black transition-colors rounded-none"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-5">
          <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-900 border border-zinc-800 p-3 rounded-none">
            <strong className="text-yellow-500">Fluxo Instantâneo (Opção A):</strong> O posto criado será salvo imediatamente no banco e vinculado a este cliente. Se você cancelar o contrato depois, o posto continuará salvo para uso futuro.
          </p>

          {/* Dados de Identificação */}
          <div className="space-y-3 bg-[#161616] border border-zinc-800 p-4 rounded-none">
            <h4 className="text-xs font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-800 pb-2">
              <Shield className="h-3.5 w-3.5" /> Identificação do Posto
            </h4>

            {/* Código do Posto */}
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 font-bold uppercase">Código do Posto</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.postCode}
                  onChange={(e) => setFormData({ ...formData, postCode: e.target.value })}
                  placeholder="Ex: PST-XYZ"
                  className="bg-black border-zinc-800 text-white placeholder-zinc-600 rounded-none focus-visible:ring-1 focus-visible:ring-yellow-500 h-9 text-xs"
                />
                <Button
                  type="button"
                  onClick={generatePostCode}
                  className="bg-zinc-900 border border-zinc-700 hover:bg-yellow-500 hover:text-black rounded-none h-9 px-3 text-xs"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Nome do Posto */}
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 font-bold uppercase">Nome do Posto *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Portaria Principal A"
                className="bg-black border-zinc-800 text-white placeholder-zinc-600 rounded-none focus-visible:ring-1 focus-visible:ring-yellow-500 h-9 text-xs"
                required
              />
            </div>

            {/* Tipo de Posto */}
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 font-bold uppercase">Tipo de Posto</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger className="bg-black border-zinc-800 text-white rounded-none h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                  <SelectItem value="POSTO_24H" className="hover:bg-zinc-800">Posto 24h</SelectItem>
                  <SelectItem value="POSTO_SDF" className="hover:bg-zinc-800">Posto SDF</SelectItem>
                  <SelectItem value="POSTO_12H_NOTURNO" className="hover:bg-zinc-800">12h Noturno</SelectItem>
                  <SelectItem value="POSTO_12H_DIURNO" className="hover:bg-zinc-800">12h Diurno</SelectItem>
                  <SelectItem value="POSTO_6H" className="hover:bg-zinc-800">Posto 6h</SelectItem>
                  <SelectItem value="POSTO_8H" className="hover:bg-zinc-800">Posto 8h</SelectItem>
                  <SelectItem value="OUTROS" className="hover:bg-zinc-800">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dados Técnicos de Escala e Turnos */}
          <div className="space-y-3 bg-[#161616] border border-zinc-800 p-4 rounded-none">
            <h4 className="text-xs font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-800 pb-2">
              <Clock className="h-3.5 w-3.5" /> Escala e Cobertura
            </h4>

            {/* Escala */}
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 font-bold uppercase">Escala</Label>
              <Select
                value={formData.workSchedule}
                onValueChange={(value) => setFormData({ ...formData, workSchedule: value })}
              >
                <SelectTrigger className="bg-black border-zinc-800 text-white rounded-none h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                  <SelectItem value="12x36" className="hover:bg-zinc-800">12x36 (Padrão)</SelectItem>
                  <SelectItem value="5x2" className="hover:bg-zinc-800">5x2 (Seg a Sex)</SelectItem>
                  <SelectItem value="6x1" className="hover:bg-zinc-800">6x1 (Seis por um)</SelectItem>
                  <SelectItem value="4x2" className="hover:bg-zinc-800">4x2 (Quatro por dois)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Horários de Início e Término */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300 font-bold uppercase">Entrada</Label>
                <Input
                  type="text"
                  value={formData.shiftStart}
                  onChange={(e) => setFormData({ ...formData, shiftStart: e.target.value })}
                  placeholder="07:00"
                  className="bg-black border-zinc-800 text-white placeholder-zinc-700 rounded-none h-9 text-xs text-center font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300 font-bold uppercase">Saída</Label>
                <Input
                  type="text"
                  value={formData.shiftEnd}
                  onChange={(e) => setFormData({ ...formData, shiftEnd: e.target.value })}
                  placeholder="19:00"
                  className="bg-black border-zinc-800 text-white placeholder-zinc-700 rounded-none h-9 text-xs text-center font-mono"
                />
              </div>
            </div>

            {/* Nome do Turno */}
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 font-bold uppercase">Descrição do Turno</Label>
              <Input
                value={formData.shiftDescription}
                onChange={(e) => setFormData({ ...formData, shiftDescription: e.target.value })}
                placeholder="Ex: Turno Diurno 12h"
                className="bg-black border-zinc-800 text-white placeholder-zinc-600 rounded-none h-9 text-xs"
              />
            </div>

            {/* Efetivo Requerido */}
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 font-bold uppercase flex justify-between">
                <span>Efetivo de Profissionais</span>
                <span className="text-yellow-500 font-mono">{formData.requiredVigilantes}</span>
              </Label>
              <div className="flex gap-2 items-center">
                <Users className="h-4 w-4 text-zinc-500" />
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.requiredVigilantes}
                  onChange={(e) => setFormData({ ...formData, requiredVigilantes: parseInt(e.target.value) || 1 })}
                  className="bg-black border-zinc-800 text-white rounded-none h-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Dados de Endereço */}
          <div className="space-y-3 bg-[#161616] border border-zinc-800 p-4 rounded-none">
            <h4 className="text-xs font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-800 pb-2">
              <MapPin className="h-3.5 w-3.5" /> Endereço do Posto
            </h4>

            {/* CEP */}
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 font-bold uppercase flex items-center justify-between">
                <span>CEP</span>
                {loadingCep && (
                  <span className="text-yellow-500 font-mono flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Buscando...
                  </span>
                )}
              </Label>
              <Input
                value={formData.zipCode}
                onChange={(e) => {
                  const valor = formatZipCode(e.target.value);
                  setFormData(prev => ({ ...prev, zipCode: valor }));
                  const cepLimpo = valor.replace(/\D/g, '');
                  if (cepLimpo.length === 8) {
                    buscarCep(cepLimpo);
                  }
                }}
                placeholder="00000-000"
                maxLength={9}
                className="bg-black border-zinc-800 text-white placeholder-zinc-600 rounded-none h-9 text-xs font-mono focus-visible:ring-1 focus-visible:ring-yellow-500"
              />
            </div>

            {/* Endereço */}
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 font-bold uppercase">Endereço Completo</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Rua, Número, Bairro"
                className="bg-black border-zinc-800 text-white placeholder-zinc-600 rounded-none h-9 text-xs focus-visible:ring-1 focus-visible:ring-yellow-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300 font-bold uppercase">Cidade</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Ex: Contagem"
                  className="bg-black border-zinc-800 text-white placeholder-zinc-600 rounded-none h-9 text-xs focus-visible:ring-1 focus-visible:ring-yellow-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300 font-bold uppercase">Estado (UF)</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value.toUpperCase() }))}
                  placeholder="Ex: MG"
                  maxLength={2}
                  className="bg-black border-zinc-800 text-white placeholder-zinc-600 rounded-none h-9 text-xs focus-visible:ring-1 focus-visible:ring-yellow-500 uppercase"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer com Ações */}
        <div className="p-4 border-t-2 border-zinc-800 bg-[#161616] flex gap-3 justify-end">
          <Button
            type="button"
            onClick={onClose}
            className="border-zinc-700 hover:bg-zinc-800 hover:text-white rounded-none bg-transparent text-zinc-300"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold uppercase tracking-wider rounded-none min-w-[120px]"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              'Salvar Posto'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
