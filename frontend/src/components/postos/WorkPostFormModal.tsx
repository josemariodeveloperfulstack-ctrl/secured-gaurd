import React, { useState, useEffect } from 'react';
import { X, Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { workPostService, WorkPost, CreateWorkPostRequest } from '@/services/workPostService';
import { companyService } from '@/services/companyService';
import { positionService, type Position } from '@/services/positionService';
import { Client } from '@/types/client';

interface WorkPostFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workPost?: WorkPost | null;
  clients: Client[];
  onSubmit: (savedWorkPost?: WorkPost) => void;
  forcedClientId?: string;
  defaultAddress?: string;
  defaultCity?: string;
  defaultState?: string;
  defaultZipCode?: string;
}

const WorkPostFormModal: React.FC<WorkPostFormModalProps> = ({
  open,
  onOpenChange,
  workPost,
  clients,
  onSubmit,
  forcedClientId,
  defaultAddress,
  defaultCity,
  defaultState,
  defaultZipCode
}) => {
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; sigla?: string }>>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [formData, setFormData] = useState<CreateWorkPostRequest>({
    postCode: '',
    name: '',
    description: '',
    type: 'POSTO_24H',
    status: 'EM_IMPLANTACAO',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    clientId: '',
    companyId: '',
    requiredVigilantes: 1,
    primaryPositionId: '',
    workSchedule: '',
    shiftStart: '',
    shiftEnd: '',
    shiftDescription: '',
    transportVoucher: false,
    costAllowance: false,
    costAllowanceValue: 0,
    intrajourney: false,
    localMeal: false,
    mealTicket: false,
    healthPlan: false,
    dentalPlan: false,
    cars: 0,
    motorcycles: 0,
    radios: 0,
    corporates: 0,
    documentBank: false,
    nrs: [],
    pgr: false,
    pcmso: false,
    epis: [],
    trainings: [],
    implementationDate: '',
    implementationTime: '',
    observations: ''
  });

  const DEFAULT_POST_TYPES = [
    '01 Portaria 12 x 36',
    '01 - Dia (12x36)',
    '01 Portaria Noturna 12 x 36',
    'POSTO_24H',
    'POSTO_SDF',
    'POSTO_12H_NOTURNO',
    'POSTO_12H_DIURNO',
    'POSTO_6H',
    'POSTO_8H',
    'OUTROS'
  ];

  const [availablePostTypes, setAvailablePostTypes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('secured_guard_custom_post_types');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return Array.from(new Set([...DEFAULT_POST_TYPES, ...parsed]));
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_POST_TYPES;
  });

  const [isAddPostTypeOpen, setIsAddPostTypeOpen] = useState(false);
  const [newPostTypeName, setNewPostTypeName] = useState('');

  const handleAddNewPostType = () => {
    const trimmed = newPostTypeName.trim();
    if (!trimmed) return;

    if (!availablePostTypes.includes(trimmed)) {
      const updated = [...availablePostTypes, trimmed];
      setAvailablePostTypes(updated);
      try {
        const customOnly = updated.filter(t => !DEFAULT_POST_TYPES.includes(t));
        localStorage.setItem('secured_guard_custom_post_types', JSON.stringify(customOnly));
      } catch {
        // ignore
      }
    }

    handleInputChange('type', trimmed);
    setNewPostTypeName('');
    setIsAddPostTypeOpen(false);
    toast({
      title: "Posto de Trabalho cadastrado",
      description: `O posto de trabalho "${trimmed}" foi adicionado e selecionado.`,
    });
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'POSTO_24H': return 'Posto 24h';
      case 'POSTO_SDF': return 'Posto SDF';
      case 'POSTO_12H_NOTURNO': return '12h Noturno';
      case 'POSTO_12H_DIURNO': return '12h Diurno';
      case 'POSTO_6H': return 'Posto 6h';
      case 'POSTO_8H': return 'Posto 8h';
      case 'OUTROS': return 'Outros';
      default: return type;
    }
  };

  // Gestão de Seleção Múltipla de Empresas
  const selectedCompanyIds = React.useMemo(() => {
    if (!formData.companyId) return [];
    return formData.companyId.split(',').map(id => id.trim()).filter(Boolean);
  }, [formData.companyId]);

  const handleToggleCompany = (companyId: string, checked: boolean) => {
    let newIds: string[];
    if (checked) {
      newIds = Array.from(new Set([...selectedCompanyIds, companyId]));
    } else {
      newIds = selectedCompanyIds.filter(id => id !== companyId);
    }
    handleInputChange('companyId', newIds.join(','));
  };

  // Gestão de EPIs Padrão e Customizados
  const STANDARD_EPIS = [
    'Colete à Prova de Balas',
    'Calçado de Segurança / Botina',
    'Protetor Auricular',
    'Óculos de Proteção',
    'Luvas de Proteção / Táticas',
    'Capacete de Segurança',
    'Capa de Chuva',
    'Lanterna Tática',
    'Máscara Respiratória / PFF2',
    'Cinto Tático'
  ];

  const [customEpiInput, setCustomEpiInput] = useState('');
  const currentEpis = Array.isArray(formData.epis) ? formData.epis : [];

  const handleToggleEpi = (epiName: string, checked: boolean) => {
    let updated: string[];
    if (checked) {
      updated = Array.from(new Set([...currentEpis, epiName]));
    } else {
      updated = currentEpis.filter((e) => e !== epiName);
    }
    handleInputChange('epis', updated);
  };

  const handleAddCustomEpi = () => {
    const trimmed = customEpiInput.trim();
    if (!trimmed) return;

    if (!currentEpis.includes(trimmed)) {
      handleInputChange('epis', [...currentEpis, trimmed]);
    }
    setCustomEpiInput('');
    toast({
      title: "EPI Adicionado",
      description: `O EPI "${trimmed}" foi adicionado à lista.`,
    });
  };

  const handleRemoveEpi = (epiName: string) => {
    handleInputChange('epis', currentEpis.filter((e) => e !== epiName));
  };

  // Gestão de Treinamentos Padrão e Customizados
  const STANDARD_TRAININGS = [
    'Curso de Formação de Vigilante',
    'Reciclagem de Vigilante',
    'Primeiros Socorros / APH',
    'Combate a Incêndio / Brigada',
    'Gerenciamento de Crises e Conflitos',
    'Defesa Pessoal / Manuseio de Tonfa',
    'Relações Humanas no Trabalho',
    'Uso de Equipamentos não Letais',
    'Segurança Física de Instalações',
    'Supervisão e Liderança de Equipes'
  ];

  const [customTrainingInput, setCustomTrainingInput] = useState('');
  const currentTrainings = Array.isArray(formData.trainings) ? formData.trainings : [];

  const handleToggleTraining = (trainingName: string, checked: boolean) => {
    let updated: string[];
    if (checked) {
      updated = Array.from(new Set([...currentTrainings, trainingName]));
    } else {
      updated = currentTrainings.filter((t) => t !== trainingName);
    }
    handleInputChange('trainings', updated);
  };

  const handleAddCustomTraining = () => {
    const trimmed = customTrainingInput.trim();
    if (!trimmed) return;

    if (!currentTrainings.includes(trimmed)) {
      handleInputChange('trainings', [...currentTrainings, trimmed]);
    }
    setCustomTrainingInput('');
    toast({
      title: "Treinamento Adicionado",
      description: `O treinamento "${trimmed}" foi adicionado à lista.`,
    });
  };

  const handleRemoveTraining = (trainingName: string) => {
    handleInputChange('trainings', currentTrainings.filter((t) => t !== trainingName));
  };

  // Gestão de NRs Padrão e Customizadas
  const STANDARD_NRS = [
    'NR-1 (Gerenciamento de Riscos Ocupacionais)',
    'NR-5 (CIPA)',
    'NR-6 (Equipamentos de Proteção Individual - EPI)',
    'NR-7 (PCMSO)',
    'NR-9 (Avaliação e Controle de Exposições)',
    'NR-10 (Segurança em Eletricidade)',
    'NR-12 (Segurança em Máquinas e Equipamentos)',
    'NR-17 (Ergonomia)',
    'NR-23 (Proteção Contra Incêndios)',
    'NR-35 (Trabalho em Altura)'
  ];

  const [customNrInput, setCustomNrInput] = useState('');
  const currentNrs = Array.isArray(formData.nrs) ? formData.nrs : [];

  const handleToggleNr = (nrName: string, checked: boolean) => {
    let updated: string[];
    if (checked) {
      updated = Array.from(new Set([...currentNrs, nrName]));
    } else {
      updated = currentNrs.filter((n) => n !== nrName);
    }
    handleInputChange('nrs', updated);
  };

  const handleAddCustomNr = () => {
    const trimmed = customNrInput.trim();
    if (!trimmed) return;

    if (!currentNrs.includes(trimmed)) {
      handleInputChange('nrs', [...currentNrs, trimmed]);
    }
    setCustomNrInput('');
    toast({
      title: "NR Adicionada",
      description: `A norma "${trimmed}" foi adicionada à lista.`,
    });
  };

  const handleRemoveNr = (nrName: string) => {
    handleInputChange('nrs', currentNrs.filter((n) => n !== nrName));
  };

  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const normalizeText = (value?: string) =>
    (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();

  const selectedCompany = companies.find((company) => company.id === formData.companyId);
  const isPromoverVigilancia = normalizeText(selectedCompany?.name).includes('PROMOVER VIGILANCIA PATRIMONIAL');
  const nonVigilantePositions = positions.filter((position) => !normalizeText(position.name).includes('VIGILANTE'));
  const vigilantePosition = positions.find((position) => normalizeText(position.name).includes('VIGILANTE'));

  useEffect(() => {
    if (!open) {
      return;
    }

    const loadReferenceData = async () => {
      try {
        const [companiesData, positionsData] = await Promise.all([
          companyService.getAllCompanies(),
          positionService.getPositions()
        ]);
        setCompanies(companiesData);
        setPositions(positionsData);
      } catch (error) {
        console.error('Erro ao carregar empresas/cargos do posto:', error);
      }
    };

    void loadReferenceData();
  }, [open]);

  const generatePostCodeFromName = (name: string) => {
    if (!name) return '';
    const normalized = name
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    const slug = normalized.toUpperCase().replace(/-+/g, '-').slice(0, 28);
    const hasSuffix = /-\d{2,}$/.test(slug);
    return hasSuffix ? slug : `${slug}-001`;
  };

  useEffect(() => {
    if (workPost) {
      setFormData({
        postCode: workPost.postCode,
        name: workPost.name,
        description: workPost.description || '',
        type: workPost.type,
        status: workPost.status,
        address: workPost.address,
        city: workPost.city || '',
        state: workPost.state || '',
        zipCode: workPost.zipCode || '',
        clientId: workPost.clientId,
        companyId: workPost.companyId,
        contractId: workPost.contractId,
        responsibleId: workPost.responsibleId,
        requiredVigilantes: workPost.requiredVigilantes,
        primaryPositionId: workPost.primaryPositionId,
        workSchedule: workPost.workSchedule,
        shiftStart: workPost.shiftStart,
        shiftEnd: workPost.shiftEnd,
        shiftDescription: workPost.shiftDescription || '',
        transportVoucher: workPost.transportVoucher || false,
        costAllowance: workPost.costAllowance || false,
        costAllowanceValue: workPost.costAllowanceValue || 0,
        intrajourney: workPost.intrajourney || false,
        localMeal: workPost.localMeal || false,
        mealTicket: workPost.mealTicket || false,
        healthPlan: workPost.healthPlan || false,
        dentalPlan: workPost.dentalPlan || false,
        cars: workPost.cars || 0,
        motorcycles: workPost.motorcycles || 0,
        radios: workPost.radios || 0,
        corporates: workPost.corporates || 0,
        documentBank: workPost.documentBank || false,
        nrs: workPost.nrs || [],
        pgr: workPost.pgr || false,
        pcmso: workPost.pcmso || false,
        epis: workPost.epis || [],
        trainings: workPost.trainings || [],
        implementationDate: workPost.implementationDate || '',
        implementationTime: workPost.implementationTime || '',
        observations: workPost.observations || ''
      });
    } else {
      setFormData({
        postCode: '',
        name: '',
        description: '',
        type: 'POSTO_24H',
        status: 'EM_IMPLANTACAO',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        clientId: '',
        companyId: '',
        requiredVigilantes: 1,
        primaryPositionId: '',
        workSchedule: '',
        shiftStart: '',
        shiftEnd: '',
        shiftDescription: '',
        transportVoucher: false,
        costAllowance: false,
        costAllowanceValue: 0,
        intrajourney: false,
        localMeal: false,
        mealTicket: false,
        healthPlan: false,
        dentalPlan: false,
        cars: 0,
        motorcycles: 0,
        radios: 0,
        corporates: 0,
        documentBank: false,
        nrs: [],
        pgr: false,
        pcmso: false,
        epis: [],
        trainings: [],
        implementationDate: '',
        implementationTime: '',
        observations: ''
      });

      // Se houver um ID forçado, aplicar ao criar novo
      if (forcedClientId && !workPost) {
        setFormData(prev => ({
          ...prev,
          clientId: forcedClientId,
          address: defaultAddress || prev.address,
          city: defaultCity || prev.city,
          state: defaultState || prev.state,
          zipCode: defaultZipCode || prev.zipCode
        }));
      }
    }
  }, [workPost, forcedClientId, defaultAddress, defaultCity, defaultState, defaultZipCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientId) {
      toast({
        title: "Erro",
        description: "Cliente é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (!formData.companyId) {
      toast({
        title: "Erro",
        description: "Empresa é obrigatória",
        variant: "destructive",
      });
      return;
    }

    if (!isPromoverVigilancia && !formData.primaryPositionId) {
      toast({
        title: "Erro",
        description: "Selecione o cargo principal do posto",
        variant: "destructive",
      });
      return;
    }

    // Validar dados antes de enviar
    if (!formData.shiftStart || !formData.shiftEnd) {
      toast({
        title: "Erro",
        description: "Horários de início e fim do turno são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      let savedWorkPost: WorkPost;

      console.log('Dados do formulário antes do envio:', formData);

      if (workPost) {
        savedWorkPost = await workPostService.updateWorkPost(workPost.id, formData);
        toast({
          title: "Sucesso",
          description: "Posto de trabalho atualizado com sucesso",
        });
      } else {
        savedWorkPost = await workPostService.createWorkPost(formData);
        toast({
          title: "Sucesso",
          description: "Posto de trabalho criado com sucesso",
        });
      }

      onSubmit(savedWorkPost);
    } catch (error: any) {
      console.error('Erro ao salvar posto:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Erro ao salvar posto de trabalho",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateWorkPostRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  useEffect(() => {
    if (!formData.companyId) {
      return;
    }

    if (isPromoverVigilancia) {
      setFormData((prev) => ({
        ...prev,
        primaryPositionId: vigilantePosition?.id || prev.primaryPositionId || ''
      }));
      return;
    }

    if (prevIsVigilanteOnly(formData.primaryPositionId, positions)) {
      setFormData((prev) => ({
        ...prev,
        primaryPositionId: ''
      }));
    }
  }, [formData.companyId, isPromoverVigilancia, vigilantePosition?.id, formData.primaryPositionId, positions]);

  const prevIsVigilanteOnly = (positionId?: string, allPositions: Position[] = []) => {
    if (!positionId) {
      return false;
    }
    const currentPosition = allPositions.find((position) => position.id === positionId);
    return !!currentPosition && normalizeText(currentPosition.name).includes('VIGILANTE');
  };

  // Função para converter números de forma segura
  const handleNumberChange = (field: keyof CreateWorkPostRequest, value: string) => {
    if (value === '') {
      handleInputChange(field, 0);
      return;
    }

    // Para campos decimais como costAllowanceValue
    if (field === 'costAllowanceValue') {
      const numValue = parseFloat(value);
      const safeValue = isNaN(numValue) ? 0 : numValue;
      handleInputChange(field, safeValue);
    } else {
      // Para campos inteiros
      const numValue = parseInt(value);
      const safeValue = isNaN(numValue) ? 0 : numValue;
      handleInputChange(field, safeValue);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] max-h-[850px] flex flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 py-4 border-b">
          <DialogTitle>
            {workPost ? 'Editar Setor de Trabalho' : 'Novo Setor de Trabalho'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Informações Básicas */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="postCode">Código do Setor de Trabalho *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="postCode"
                  value={formData.postCode}
                  onChange={(e) => handleInputChange('postCode', e.target.value)}
                  placeholder="Ex: SETOR-001"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const code = generatePostCodeFromName(formData.name);
                    if (!code) {
                      toast({ title: 'Informe o Nome do Setor', description: 'Preencha o campo Nome do Setor de Trabalho para gerar o código automaticamente.', variant: 'default' });
                      return;
                    }
                    setFormData(prev => ({ ...prev, postCode: code }));
                  }}
                  disabled={!formData.name}
                  className="border-gray-600 text-gray-300 hover:bg-seguranca-black"
                  title="Gerar código a partir do nome"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome do Setor de Trabalho *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ex: Setor Cidade Nova / Portaria Central"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="type">Posto de Trabalho *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddPostTypeOpen(true)}
                  className="h-6 text-xs text-primary hover:underline px-1"
                >
                  + Cadastrar Novo Posto
                </Button>
              </div>
              <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o Posto de Trabalho" />
                </SelectTrigger>
                <SelectContent>
                  {availablePostTypes.map((pt) => (
                    <SelectItem key={pt} value={pt}>
                      {getTypeText(pt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EM_IMPLANTACAO">Em Implantação</SelectItem>
                  <SelectItem value="ATIVO">Ativo</SelectItem>
                  <SelectItem value="INATIVO">Inativo</SelectItem>
                  <SelectItem value="SUSPENSO">Suspenso</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                  <SelectItem value="EM_ANALISE">Em Análise</SelectItem>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Empresa(s) *</Label>
              <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto bg-background">
                {companies.length === 0 ? (
                  <span className="text-sm text-muted-foreground">Carregando empresas...</span>
                ) : (
                  companies.map((company) => {
                    const isChecked = selectedCompanyIds.includes(company.id);
                    return (
                      <div key={company.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`company-${company.id}`}
                          checked={isChecked}
                          onChange={(e) => handleToggleCompany(company.id, e.target.checked)}
                          className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                        />
                        <Label htmlFor={`company-${company.id}`} className="cursor-pointer text-sm font-medium">
                          {company.sigla ? `${company.sigla} - ${company.name}` : company.name}
                        </Label>
                      </div>
                    );
                  })
                )}
              </div>
              {selectedCompanyIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedCompanyIds.map((id) => {
                    const comp = companies.find((c) => c.id === id);
                    if (!comp) return null;
                    return (
                      <Badge key={id} variant="secondary" className="text-xs flex items-center gap-1.5 py-1 px-2.5">
                        <span>{comp.sigla || comp.name}</span>
                        <X
                          className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground"
                          onClick={() => handleToggleCompany(id, false)}
                        />
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {!isPromoverVigilancia && (
              <div className="space-y-2">
                <Label htmlFor="primaryPositionId">Cargo Principal *</Label>
                <Select
                  value={formData.primaryPositionId || ''}
                  onValueChange={(value) => handleInputChange('primaryPositionId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cargo do posto" />
                  </SelectTrigger>
                  <SelectContent>
                    {nonVigilantePositions.map((position) => (
                      <SelectItem key={position.id} value={position.id}>
                        {position.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isPromoverVigilancia && (
              <div className="space-y-2">
                <Label>Cargo Principal</Label>
                <Input value={vigilantePosition?.name || 'Vigilante'} disabled />
              </div>
            )}
          </div>

          {/* Cliente - Só exibe se não houver um ID forçado */}
          {!forcedClientId && (
            <div className="space-y-2">
              <Label htmlFor="clientId">Cliente *</Label>
              <Select value={formData.clientId} onValueChange={(value) => handleInputChange('clientId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Localização */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="address">Endereço *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Endereço completo"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="Cidade"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                placeholder="UF"
                maxLength={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">CEP</Label>
              <Input
                id="zipCode"
                value={formData.zipCode}
                onChange={(e) => handleInputChange('zipCode', e.target.value)}
                placeholder="00000-000"
              />
            </div>
          </div>

          {/* Configuração de Pessoal */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="requiredVigilantes">
                {isPromoverVigilancia ? 'Vigilantes Necessários *' : 'Quantidade Necessária *'}
              </Label>
              <Input
                id="requiredVigilantes"
                type="number"
                min="1"
                value={formData.requiredVigilantes || ''}
                onChange={(e) => handleNumberChange('requiredVigilantes', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workSchedule">Escala de Trabalho *</Label>
              <Input
                id="workSchedule"
                value={formData.workSchedule}
                onChange={(e) => handleInputChange('workSchedule', e.target.value)}
                placeholder="Ex: 12x36"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shiftDescription">Descrição do Turno</Label>
              <Input
                id="shiftDescription"
                value={formData.shiftDescription}
                onChange={(e) => handleInputChange('shiftDescription', e.target.value)}
                placeholder="Ex: 18:00 às 06:00"
              />
            </div>
          </div>

          {/* Horários */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shiftStart">Início do Turno *</Label>
              <Input
                id="shiftStart"
                type="time"
                value={formData.shiftStart}
                onChange={(e) => handleInputChange('shiftStart', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shiftEnd">Fim do Turno *</Label>
              <Input
                id="shiftEnd"
                type="time"
                value={formData.shiftEnd}
                onChange={(e) => handleInputChange('shiftEnd', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Implantação */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="implementationDate">Data de Implantação</Label>
              <Input
                id="implementationDate"
                type="date"
                value={formData.implementationDate}
                onChange={(e) => handleInputChange('implementationDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="implementationTime">Horário de Implantação</Label>
              <Input
                id="implementationTime"
                type="time"
                value={formData.implementationTime}
                onChange={(e) => handleInputChange('implementationTime', e.target.value)}
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descrição detalhada do posto..."
              rows={3}
            />
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observations">Observações</Label>
            <Textarea
              id="observations"
              value={formData.observations}
              onChange={(e) => handleInputChange('observations', e.target.value)}
              placeholder="Observações complementares..."
              rows={3}
            />
          </div>

          {/* Benefícios e Condições */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Benefícios e Condições</h3>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="transportVoucher"
                  checked={formData.transportVoucher || false}
                  onChange={(e) => handleInputChange('transportVoucher', e.target.checked)}
                />
                <Label htmlFor="transportVoucher">Vale Transporte</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="costAllowance"
                  checked={formData.costAllowance || false}
                  onChange={(e) => handleInputChange('costAllowance', e.target.checked)}
                />
                <Label htmlFor="costAllowance">Ajuda de Custo</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="intrajourney"
                  checked={formData.intrajourney || false}
                  onChange={(e) => handleInputChange('intrajourney', e.target.checked)}
                />
                <Label htmlFor="intrajourney">Intrajornada</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="localMeal"
                  checked={formData.localMeal || false}
                  onChange={(e) => handleInputChange('localMeal', e.target.checked)}
                />
                <Label htmlFor="localMeal">Alimentação Local</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="mealTicket"
                  checked={formData.mealTicket || false}
                  onChange={(e) => handleInputChange('mealTicket', e.target.checked)}
                />
                <Label htmlFor="mealTicket">Ticket Alimentação</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="healthPlan"
                  checked={formData.healthPlan || false}
                  onChange={(e) => handleInputChange('healthPlan', e.target.checked)}
                />
                <Label htmlFor="healthPlan">Plano de Saúde</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="dentalPlan"
                  checked={formData.dentalPlan || false}
                  onChange={(e) => handleInputChange('dentalPlan', e.target.checked)}
                />
                <Label htmlFor="dentalPlan">Plano Odontológico</Label>
              </div>
            </div>

            {formData.costAllowance && (
              <div className="space-y-2">
                <Label htmlFor="costAllowanceValue">Valor da Ajuda de Custo (R$)</Label>
                <Input
                  id="costAllowanceValue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.costAllowanceValue || ''}
                  onChange={(e) => handleNumberChange('costAllowanceValue', e.target.value)}
                  placeholder="0,00"
                />
              </div>
            )}
          </div>

          {/* Recursos e Equipamentos */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Recursos e Equipamentos</h3>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="cars">Carros</Label>
                <Input
                  id="cars"
                  type="number"
                  min="0"
                  value={formData.cars || ''}
                  onChange={(e) => handleNumberChange('cars', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="motorcycles">Motos</Label>
                <Input
                  id="motorcycles"
                  type="number"
                  min="0"
                  value={formData.motorcycles || ''}
                  onChange={(e) => handleNumberChange('motorcycles', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="radios">Rádios</Label>
                <Input
                  id="radios"
                  type="number"
                  min="0"
                  value={formData.radios || ''}
                  onChange={(e) => handleNumberChange('radios', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="corporates">Corporativos</Label>
                <Input
                  id="corporates"
                  type="number"
                  min="0"
                  value={formData.corporates || ''}
                  onChange={(e) => handleNumberChange('corporates', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="documentBank"
                checked={formData.documentBank || false}
                onChange={(e) => handleInputChange('documentBank', e.target.checked)}
              />
              <Label htmlFor="documentBank">Banco DOC</Label>
            </div>
          </div>

          {/* Conformidade Legal */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Conformidade Legal</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="pgr"
                  checked={formData.pgr || false}
                  onChange={(e) => handleInputChange('pgr', e.target.checked)}
                />
                <Label htmlFor="pgr">PGR (Programa de Gerenciamento de Riscos)</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="pcmso"
                  checked={formData.pcmso || false}
                  onChange={(e) => handleInputChange('pcmso', e.target.checked)}
                />
                <Label htmlFor="pcmso">PCMSO (Programa de Controle Médico)</Label>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="nrs">Normas Regulamentadoras (NRs)</Label>

              {/* Checkboxes de NRs Padrão */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border rounded-md p-3 bg-muted/10">
                {STANDARD_NRS.map((nr) => {
                  const isChecked = currentNrs.includes(nr);
                  return (
                    <div key={nr} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`nr-${nr}`}
                        checked={isChecked}
                        onChange={(e) => handleToggleNr(nr, e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                      />
                      <Label htmlFor={`nr-${nr}`} className="cursor-pointer text-xs font-medium">
                        {nr}
                      </Label>
                    </div>
                  );
                })}
              </div>

              {/* Inserção Manual de NR */}
              <div className="flex gap-2 items-center">
                <Input
                  id="customNr"
                  placeholder="Digitar outra NR que não está na lista (ex: NR-33)..."
                  value={customNrInput}
                  onChange={(e) => setCustomNrInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomNr();
                    }
                  }}
                  className="text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomNr}
                  disabled={!customNrInput.trim()}
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>

              {/* Badges de NRs Selecionadas */}
              {currentNrs.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">NRs Selecionadas ({currentNrs.length}):</span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentNrs.map((nr) => (
                      <Badge key={nr} variant="secondary" className="text-xs flex items-center gap-1.5 py-1 px-2.5">
                        <span>{nr}</span>
                        <X
                          className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground"
                          onClick={() => handleRemoveNr(nr)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="epis">EPIs Necessários</Label>

              {/* Checkboxes de EPIs Padrão */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border rounded-md p-3 bg-muted/10">
                {STANDARD_EPIS.map((epi) => {
                  const isChecked = currentEpis.includes(epi);
                  return (
                    <div key={epi} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`epi-${epi}`}
                        checked={isChecked}
                        onChange={(e) => handleToggleEpi(epi, e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                      />
                      <Label htmlFor={`epi-${epi}`} className="cursor-pointer text-xs font-medium">
                        {epi}
                      </Label>
                    </div>
                  );
                })}
              </div>

              {/* Inserção Manual de EPI */}
              <div className="flex gap-2 items-center">
                <Input
                  id="customEpi"
                  placeholder="Digitar outro EPI que não está na lista..."
                  value={customEpiInput}
                  onChange={(e) => setCustomEpiInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomEpi();
                    }
                  }}
                  className="text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomEpi}
                  disabled={!customEpiInput.trim()}
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>

              {/* Badges de EPIs Selecionados */}
              {currentEpis.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">EPIs Selecionados ({currentEpis.length}):</span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentEpis.map((epi) => (
                      <Badge key={epi} variant="secondary" className="text-xs flex items-center gap-1.5 py-1 px-2.5">
                        <span>{epi}</span>
                        <X
                          className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground"
                          onClick={() => handleRemoveEpi(epi)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="trainings">Treinamentos Necessários</Label>

              {/* Checkboxes de Treinamentos Padrão */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border rounded-md p-3 bg-muted/10">
                {STANDARD_TRAININGS.map((training) => {
                  const isChecked = currentTrainings.includes(training);
                  return (
                    <div key={training} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`training-${training}`}
                        checked={isChecked}
                        onChange={(e) => handleToggleTraining(training, e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                      />
                      <Label htmlFor={`training-${training}`} className="cursor-pointer text-xs font-medium">
                        {training}
                      </Label>
                    </div>
                  );
                })}
              </div>

              {/* Inserção Manual de Treinamento */}
              <div className="flex gap-2 items-center">
                <Input
                  id="customTraining"
                  placeholder="Digitar outro treinamento que não está na lista..."
                  value={customTrainingInput}
                  onChange={(e) => setCustomTrainingInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomTraining();
                    }
                  }}
                  className="text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomTraining}
                  disabled={!customTrainingInput.trim()}
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>

              {/* Badges de Treinamentos Selecionados */}
              {currentTrainings.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Treinamentos Selecionados ({currentTrainings.length}):</span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentTrainings.map((training) => (
                      <Badge key={training} variant="secondary" className="text-xs flex items-center gap-1.5 py-1 px-2.5">
                        <span>{training}</span>
                        <X
                          className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground"
                          onClick={() => handleRemoveTraining(training)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>

          {/* Botões Fixos no Rodapé */}
          <div className="shrink-0 border-t bg-background px-6 py-3 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : (workPost ? 'Atualizar Setor' : 'Criar Setor')}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Modal auxiliar de Cadastro de Novo Posto de Trabalho */}
      <Dialog open={isAddPostTypeOpen} onOpenChange={setIsAddPostTypeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Posto de Trabalho</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="newPostType">Descrição do Posto de Trabalho *</Label>
              <Input
                id="newPostType"
                placeholder="Ex: 01 Portaria 12 x 36"
                value={newPostTypeName}
                onChange={(e) => setNewPostTypeName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddNewPostType();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setIsAddPostTypeOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleAddNewPostType} disabled={!newPostTypeName.trim()}>
                Salvar e Selecionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default WorkPostFormModal; 
