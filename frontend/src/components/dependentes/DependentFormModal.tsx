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
  Users,
  CreditCard
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#1a1f2e] border-gray-700 text-white p-0 gap-0 shadow-2xl">
        <DialogHeader className="p-6 border-b border-gray-700 bg-[#232936]">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/20 p-2 rounded-lg">
              <Users className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-white">
                {dependent ? 'Editar Dependente' : 'Adicionar Dependente'}
              </DialogTitle>
              <p className="text-sm text-gray-400 mt-1">
                {dependent ? 'Atualize os dados do dependente abaixo' : 'Preencha o formulário para adicionar um novo dependente'}
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-[#131722] p-1 mb-8 rounded-lg border border-gray-800">
                <TabsTrigger value="dados-basicos" className="data-[state='active']:bg-blue-600 data-[state='active']:text-white rounded-md transition-all">
                  <User className="h-4 w-4 mr-2" /> Dados Básicos
                </TabsTrigger>
                <TabsTrigger value="contato" className="data-[state='active']:bg-blue-600 data-[state='active']:text-white rounded-md transition-all">
                  <Phone className="h-4 w-4 mr-2" /> Contato
                </TabsTrigger>
                <TabsTrigger value="informacoes" className="data-[state='active']:bg-blue-600 data-[state='active']:text-white rounded-md transition-all">
                  <Heart className="h-4 w-4 mr-2" /> Informações
                </TabsTrigger>
              </TabsList>

              {/* Dados Básicos */}
              <TabsContent value="dados-basicos" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-300 font-medium">
                      Nome Completo <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="bg-white text-gray-900 border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md h-10 shadow-sm"
                      placeholder="Nome completo do dependente"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="relationship" className="text-gray-300 font-medium">
                      Parentesco <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.relationship} onValueChange={(value) => handleInputChange('relationship', value)}>
                      <SelectTrigger className="bg-white text-gray-900 border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md h-10 shadow-sm">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 text-gray-900">
                        {RELATIONSHIP_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="hover:bg-gray-100 cursor-pointer">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birthDate" className="text-gray-300 font-medium">
                      Data de Nascimento <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="birthDate"
                        type="date"
                        value={formData.birthDate}
                        onChange={(e) => handleInputChange('birthDate', e.target.value)}
                        className="bg-white text-gray-900 border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md h-10 shadow-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender" className="text-gray-300 font-medium">
                      Gênero
                    </Label>
                    <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                      <SelectTrigger className="bg-white text-gray-900 border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md h-10 shadow-sm">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 text-gray-900">
                        {GENDER_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="hover:bg-gray-100 cursor-pointer">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cpf" className="text-gray-300 font-medium">
                      CPF <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => handleInputChange('cpf', formatCpf(e.target.value))}
                      className="bg-white text-gray-900 border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md h-10 shadow-sm"
                      placeholder="000.000.000-00"
                      maxLength={14}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rg" className="text-gray-300 font-medium">
                      RG
                    </Label>
                    <Input
                      id="rg"
                      value={formData.rg}
                      onChange={(e) => handleInputChange('rg', e.target.value)}
                      className="bg-white text-gray-900 border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md h-10 shadow-sm"
                      placeholder="Número do RG"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Contato */}
              <TabsContent value="contato" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-300 font-medium">
                      Telefone
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', formatPhone(e.target.value))}
                      className="bg-white text-gray-900 border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md h-10 shadow-sm"
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-300 font-medium">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="bg-white text-gray-900 border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md h-10 shadow-sm"
                      placeholder="email@exemplo.com"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address" className="text-gray-300 font-medium">
                      Endereço
                    </Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="bg-white text-gray-900 border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md h-10 shadow-sm"
                      placeholder="Rua, número, complemento"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-gray-300 font-medium">
                      Cidade
                    </Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="bg-white text-gray-900 border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md h-10 shadow-sm"
                      placeholder="Cidade"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-gray-300 font-medium">
                      Estado
                    </Label>
                    <Select value={formData.state} onValueChange={(value) => handleInputChange('state', value)}>
                      <SelectTrigger className="bg-white text-gray-900 border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md h-10 shadow-sm">
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 text-gray-900">
                        {STATE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="hover:bg-gray-100 cursor-pointer">
                            {option.value} - {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zipCode" className="text-gray-300 font-medium">
                      CEP
                    </Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', formatZipCode(e.target.value))}
                      className="bg-white text-gray-900 border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md h-10 shadow-sm"
                      placeholder="00000-000"
                      maxLength={9}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Informações Adicionais */}
              <TabsContent value="informacoes" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4 bg-[#131722] p-4 rounded-lg border border-gray-800">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isStudent"
                        checked={formData.isStudent}
                        onCheckedChange={(checked) => handleInputChange('isStudent', checked as boolean)}
                        className="border-gray-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <Label htmlFor="isStudent" className="text-gray-300 flex items-center gap-2 cursor-pointer font-medium">
                        <GraduationCap className="h-4 w-4 text-blue-400" />
                        É estudante
                      </Label>
                    </div>

                    {formData.isStudent && (
                      <div className="space-y-2 ml-6 pt-2 animate-in slide-in-from-top-2 duration-200">
                        <Label htmlFor="schoolName" className="text-gray-400 text-sm">
                          Nome da Escola/Instituição
                        </Label>
                        <Input
                          id="schoolName"
                          value={formData.schoolName}
                          onChange={(e) => handleInputChange('schoolName', e.target.value)}
                          className="bg-white text-gray-900 border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md h-9 shadow-sm"
                          placeholder="Nome da escola ou instituição"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 bg-[#131722] p-4 rounded-lg border border-gray-800">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isBeneficiary"
                        checked={formData.isBeneficiary}
                        onCheckedChange={(checked) => handleInputChange('isBeneficiary', checked as boolean)}
                        className="border-gray-500 data-[state=checked]:bg-pink-600 data-[state=checked]:border-pink-600"
                      />
                      <Label htmlFor="isBeneficiary" className="text-gray-300 flex items-center gap-2 cursor-pointer font-medium">
                        <Heart className="h-4 w-4 text-pink-400" />
                        É beneficiário de planos
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-gray-300 font-medium">
                    Observações
                  </Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    className="bg-white text-gray-900 border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md shadow-sm"
                    placeholder="Observações adicionais..."
                    rows={4}
                  />
                </div>

                {employeeName && (
                  <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4 flex items-center gap-3">
                    <div className="bg-blue-600/20 p-2 rounded-full">
                      <Users className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-300 font-medium uppercase tracking-wider">Funcionário Responsável</p>
                      <p className="text-white font-semibold">{employeeName}</p>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="p-6 border-t border-gray-700 bg-[#232936] rounded-b-lg flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Salvando...' : dependent ? 'Atualizar Dependente' : 'Salvar Dependente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
