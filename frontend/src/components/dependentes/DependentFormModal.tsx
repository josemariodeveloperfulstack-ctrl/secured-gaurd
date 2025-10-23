import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  GraduationCap,
  Heart,
  Save, 
  X, 
  Hash,
  Users
} from 'lucide-react';
import { Dependent, DependentFormData, RELATIONSHIP_OPTIONS, GENDER_OPTIONS, STATE_OPTIONS } from '@/types/dependent';
import { useToast } from '@/hooks/use-toast';

interface DependentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  dependent?: Dependent;
  employeeId?: string;
  employeeName?: string;
}

export const DependentFormModal: React.FC<DependentFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  dependent,
  employeeId,
  employeeName
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dados-basicos');
  const [formData, setFormData] = useState<DependentFormData>({
    employeeId: employeeId || '',
    name: '',
    relationship: '',
    birthDate: '',
    cpf: '',
    rg: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    isStudent: false,
    schoolName: '',
    isBeneficiary: false,
    notes: ''
  });

  useEffect(() => {
    if (dependent) {
      setFormData({
        employeeId: dependent.employeeId,
        name: dependent.name,
        relationship: dependent.relationship,
        birthDate: dependent.birthDate,
        cpf: dependent.cpf,
        rg: dependent.rg || '',
        gender: dependent.gender || '',
        phone: dependent.phone || '',
        email: dependent.email || '',
        address: dependent.address || '',
        city: dependent.city || '',
        state: dependent.state || '',
        zipCode: dependent.zipCode || '',
        isStudent: dependent.isStudent || false,
        schoolName: dependent.schoolName || '',
        isBeneficiary: dependent.isBeneficiary || false,
        notes: dependent.notes || ''
      });
    } else if (employeeId) {
      setFormData(prev => ({
        ...prev,
        employeeId: employeeId
      }));
    }
    setActiveTab('dados-basicos');
  }, [dependent, employeeId, isOpen]);

  const handleInputChange = (field: keyof DependentFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  const formatZipCode = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 8) {
      return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
    }
    return value;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (dependent) {
        // Atualizar dependente existente
        const updateData = {
          name: formData.name,
          relationship: formData.relationship,
          birthDate: formData.birthDate,
          cpf: formData.cpf,
          rg: formData.rg,
          gender: formData.gender,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          isStudent: formData.isStudent,
          schoolName: formData.schoolName,
          isBeneficiary: formData.isBeneficiary,
          notes: formData.notes
        };

        // TODO: Implementar chamada para atualizar dependente
        console.log('Atualizando dependente:', dependent.id, updateData);
        
        toast({
          title: "Sucesso",
          description: "Dependente atualizado com sucesso!",
        });
      } else {
        // Criar novo dependente
        const createData = {
          employeeId: formData.employeeId,
          name: formData.name,
          relationship: formData.relationship,
          birthDate: formData.birthDate,
          cpf: formData.cpf,
          rg: formData.rg,
          gender: formData.gender,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          isStudent: formData.isStudent,
          schoolName: formData.schoolName,
          isBeneficiary: formData.isBeneficiary,
          notes: formData.notes
        };

        // TODO: Implementar chamada para criar dependente
        console.log('Criando dependente:', createData);
        
        toast({
          title: "Sucesso",
          description: "Dependente criado com sucesso!",
        });
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar dependente:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Erro ao salvar dependente",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-seguranca-graphite border-gray-600 text-white p-0">
        <DialogHeader className="bg-gradient-to-r from-seguranca-red to-seguranca-darkred p-6 rounded-t-lg flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-7 w-7 text-white" />
            <DialogTitle className="text-2xl font-bold text-white">
              {dependent ? 'Editar Dependente' : 'Novo Dependente'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-seguranca-black/50 border border-gray-600/30 p-1 mb-6">
              <TabsTrigger value="dados-basicos" className="data-[state='active']:bg-seguranca-red data-[state='active']:text-white">
                <User className="h-4 w-4 mr-2" /> Dados Básicos
              </TabsTrigger>
              <TabsTrigger value="contato" className="data-[state='active']:bg-seguranca-red data-[state='active']:text-white">
                <Phone className="h-4 w-4 mr-2" /> Contato
              </TabsTrigger>
              <TabsTrigger value="informacoes" className="data-[state='active']:bg-seguranca-red data-[state='active']:text-white">
                <Heart className="h-4 w-4 mr-2" /> Informações
              </TabsTrigger>
            </TabsList>

            {/* Dados Básicos */}
            <TabsContent value="dados-basicos" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-seguranca-lightgray">
                    Nome Completo *
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="pl-10 bg-seguranca-black/70 border-gray-600 text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow/20"
                      placeholder="Nome completo do dependente"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="relationship" className="text-seguranca-lightgray">
                    Relacionamento *
                  </Label>
                  <Select value={formData.relationship} onValueChange={(value) => handleInputChange('relationship', value)}>
                    <SelectTrigger className="bg-seguranca-black/70 border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow/20">
                      <SelectValue placeholder="Selecione o relacionamento" />
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-black border-gray-600">
                      {RELATIONSHIP_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthDate" className="text-seguranca-lightgray">
                    Data de Nascimento *
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <Input
                      id="birthDate"
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => handleInputChange('birthDate', e.target.value)}
                      className="pl-10 bg-seguranca-black/70 border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow/20"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-seguranca-lightgray">
                    Gênero
                  </Label>
                  <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                    <SelectTrigger className="bg-seguranca-black/70 border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow/20">
                      <SelectValue placeholder="Selecione o gênero" />
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-black border-gray-600">
                      {GENDER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf" className="text-seguranca-lightgray">
                    CPF *
                  </Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => handleInputChange('cpf', formatCpf(e.target.value))}
                      className="pl-10 bg-seguranca-black/70 border-gray-600 text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow/20"
                      placeholder="000.000.000-00"
                      maxLength={14}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rg" className="text-seguranca-lightgray">
                    RG
                  </Label>
                  <Input
                    id="rg"
                    value={formData.rg}
                    onChange={(e) => handleInputChange('rg', e.target.value)}
                    className="bg-seguranca-black/70 border-gray-600 text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow/20"
                    placeholder="Número do RG"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Contato */}
            <TabsContent value="contato" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-seguranca-lightgray">
                    Telefone
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', formatPhone(e.target.value))}
                      className="pl-10 bg-seguranca-black/70 border-gray-600 text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow/20"
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-seguranca-lightgray">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="pl-10 bg-seguranca-black/70 border-gray-600 text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow/20"
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address" className="text-seguranca-lightgray">
                    Endereço
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-gray-400" size={20} />
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="pl-10 bg-seguranca-black/70 border-gray-600 text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow/20"
                      placeholder="Rua, número, complemento"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city" className="text-seguranca-lightgray">
                    Cidade
                  </Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="bg-seguranca-black/70 border-gray-600 text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow/20"
                    placeholder="Cidade"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state" className="text-seguranca-lightgray">
                    Estado
                  </Label>
                  <Select value={formData.state} onValueChange={(value) => handleInputChange('state', value)}>
                    <SelectTrigger className="bg-seguranca-black/70 border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow/20">
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-black border-gray-600">
                      {STATE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                          {option.value} - {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipCode" className="text-seguranca-lightgray">
                    CEP
                  </Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => handleInputChange('zipCode', formatZipCode(e.target.value))}
                    className="bg-seguranca-black/70 border-gray-600 text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow/20"
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Informações Adicionais */}
            <TabsContent value="informacoes" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isStudent"
                      checked={formData.isStudent}
                      onCheckedChange={(checked) => handleInputChange('isStudent', checked as boolean)}
                    />
                    <Label htmlFor="isStudent" className="text-seguranca-lightgray flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      É estudante
                    </Label>
                  </div>

                  {formData.isStudent && (
                    <div className="space-y-2 ml-6">
                      <Label htmlFor="schoolName" className="text-seguranca-lightgray">
                        Nome da Escola/Instituição
                      </Label>
                      <Input
                        id="schoolName"
                        value={formData.schoolName}
                        onChange={(e) => handleInputChange('schoolName', e.target.value)}
                        className="bg-seguranca-black/70 border-gray-600 text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow/20"
                        placeholder="Nome da escola ou instituição"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isBeneficiary"
                      checked={formData.isBeneficiary}
                      onCheckedChange={(checked) => handleInputChange('isBeneficiary', checked as boolean)}
                    />
                    <Label htmlFor="isBeneficiary" className="text-seguranca-lightgray flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      É beneficiário de planos
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-seguranca-lightgray">
                  Observações
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="bg-seguranca-black/70 border-gray-600 text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow/20"
                  placeholder="Observações sobre o dependente..."
                  rows={4}
                />
              </div>

              {employeeName && (
                <div className="bg-seguranca-black/30 border border-gray-600/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-seguranca-lightgray">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">Funcionário:</span>
                    <span>{employeeName}</span>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-600">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-graphite"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-to-r from-seguranca-red to-seguranca-darkred hover:from-seguranca-darkred hover:to-seguranca-red shadow-lg shadow-seguranca-red/20"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Salvando...' : dependent ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
