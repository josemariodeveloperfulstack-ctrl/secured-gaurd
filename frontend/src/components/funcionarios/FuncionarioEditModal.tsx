import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { employeeService } from '@/services/employeeService';
import { UpdateEmployeeDTO } from '@/types/employee';
import { positionService, Position } from '@/services/positionService';
import { unitService, Unit } from '@/services/unitService';
import { userService } from '@/services/userService';
import { companyService } from '@/services/companyService';
import { Company } from '@/types/company';
import { User } from '@/types/user';
import { Employee } from '@/types/employee';
import { Search, User as UserIcon, Building, Briefcase, Plus } from 'lucide-react';
import NovoCargoModal from '@/components/funcionarios/NovoCargoModal';
import { useToast } from '@/hooks/use-toast';

interface FuncionarioEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funcionario: Employee | null;
  onSuccess: () => void;
}

const FuncionarioEditModal: React.FC<FuncionarioEditModalProps> = ({ 
  open, 
  onOpenChange, 
  funcionario, 
  onSuccess 
}) => {
  const { toast } = useToast();
  const [form, setForm] = useState<UpdateEmployeeDTO>({
    name: '',
    cpf: '',
    rg: '',
    email: '',
    phone: '',
    address: '',
    birthDate: '',
    maritalStatus: 'SINGLE',
    nationality: 'Brasileiro',
    registrationNumber: '',
    hireDate: '',
    status: 'ACTIVE',
    notes: '',
    position: { id: '' },
    unit: { id: '' },
    user: { id: '' },
    company: { id: '' },
    bankData: {
      bank: '',
      agency: '',
      account: '',
      type: 'CORRENTE'
    },
    // Campos do cônjuge
    spouseName: '',
    spouseCpf: '',
    spouseRg: '',
    spouseBirthDate: '',
    spousePhone: '',
    spouseEmail: '',
    
    // Campos da ficha de registro
    empresaNome: '',
    empresaEndereco: '',
    empresaCnpj: '',
    tituloEleitor: '',
    tituloEleitorZona: '',
    tituloEleitorSecao: '',
    carteiraIdentidadeOrgaoEmissor: '',
    carteiraIdentidadeDataEmissao: '',
    certificadoMilitar: '',
    nomePai: '',
    nomeMae: '',
    localNascimento: '',
    grauInstrucao: '',
    cbo: '',
    salario: 0,
    salarioPorExtenso: '',
    periodoPagamento: '',
    horarioTrabalho: '',
    folgaSemanal: '',
    fgtsOptante: false,
    fgtsDataOpcao: '',
    fgtsBancoDepositario: '',
    fgtsDataRetratacao: '',
    pis: '',
    pisDataCadastro: '',
    pisBancoDepositario: '',
    pisEnderecoBanco: '',
    pisCodigoBanco: '',
    pisCodigoAgencia: '',
    cnhNumber: '',
    cnhExpirationDate: '',
    cnhCategory: '',
    ctps: '',
    ctpsRural: '',
    ctpsSeries: '',
    ctpsIssueDate: '',
    ctpsIssuingAgency: '',
    carteiraModelo19: '',
    registroGeralEstrangeiro: '',
    casadoBrasileiro: false,
    nomeConjugeEstrangeiro: '',
    temFilhosBrasileiros: false,
    quantidadeFilhosBrasileiros: 0,
    dataChegadaBrasil: '',
    naturalizado: false,
    decretoNaturalizacao: '',
    vistoFiscalizacao: '',
    assinaturaFuncionario: '',
    dataRescisao: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para os dados dos selects
  const [positions, setPositions] = useState<Position[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  
  // Estados para busca e filtros
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  
  // Estados para modal de novo cargo
  const [novoCargoModalOpen, setNovoCargoModalOpen] = useState(false);

  // Carregar dados para os selects quando o modal abrir
  useEffect(() => {
    if (open) {
      console.log('🔄 Modal aberto, carregando dados dos selects...');
      loadSelectData();
    }
  }, [open]);

  // Atualizar usuário e cargo selecionados quando os dados forem carregados
  useEffect(() => {
    if (funcionario && open && users.length > 0 && positions.length > 0) {
      console.log('🔄 Atualizando selects com dados carregados');
      console.log('👤 Funcionário user ID:', funcionario.user?.id);
      console.log('💼 Funcionário position ID:', funcionario.position?.id);
      console.log('📋 Users disponíveis:', users.length);
      console.log('📋 Positions disponíveis:', positions.length);
      
      // Preencher usuário selecionado
      if (funcionario.user?.id) {
        const user = users.find(u => u.id === funcionario.user?.id);
        if (user) {
          setSelectedUser(user);
          setUserSearchTerm(user.name || user.email || '');
          console.log('✅ Usuário encontrado e selecionado:', user.name);
        } else {
          console.warn('⚠️ Usuário não encontrado na lista:', funcionario.user?.id);
        }
      } else {
        console.log('ℹ️ Funcionário não tem usuário associado');
      }
      
      // Preencher cargo selecionado - comparar IDs como strings
      if (funcionario.position?.id) {
        const positionId = String(funcionario.position.id);
        const position = positions.find(p => String(p.id) === positionId);
        if (position) {
          setSelectedPosition(position);
          console.log('✅ Cargo encontrado e selecionado:', position.name);
        } else {
          console.warn('⚠️ Cargo não encontrado na lista:', positionId);
        }
      } else {
        console.log('ℹ️ Funcionário não tem cargo associado');
      }
      
      // Preencher usuário selecionado - comparar IDs como strings
      if (funcionario.user?.id) {
        const userId = String(funcionario.user.id);
        const user = users.find(u => String(u.id) === userId);
        if (user) {
          setSelectedUser(user);
          setUserSearchTerm(user.name || user.email || '');
          console.log('✅ Usuário encontrado e selecionado:', user.name);
        } else {
          console.warn('⚠️ Usuário não encontrado na lista:', userId);
        }
      } else {
        console.log('ℹ️ Funcionário não tem usuário associado');
      }
      
      // Preencher empresa selecionada - comparar IDs como strings
      if (funcionario.company?.id && companies.length > 0) {
        const companyId = String(funcionario.company.id);
        const company = companies.find(c => String(c.id) === companyId);
        if (company) {
          setSelectedCompany(company);
          console.log('✅ Empresa encontrada e selecionada:', company.name, company.id);
        } else {
          console.warn('⚠️ Empresa não encontrada na lista:', companyId);
        }
      } else {
        console.log('ℹ️ Funcionário não tem empresa associada ou lista de empresas não carregada');
      }
    }
  }, [funcionario, users, positions, companies, open]);

  // Filtrar usuários baseado no termo de busca
  useEffect(() => {
    if (userSearchTerm.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(userSearchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [userSearchTerm, users]);

  // Preencher formulário quando funcionário for selecionado
  useEffect(() => {
    if (funcionario && open) {
      console.log('🔍 Carregando dados do funcionário para edição:', funcionario);
      console.log('🔍 Dados bancários brutos:', {
        bankData: funcionario.bankData,
        bankInfo: (funcionario as any).bankInfo
      });
      
      // Tratar address que pode ser string ou objeto
      const addressValue = typeof funcionario.address === 'string' 
        ? funcionario.address 
        : funcionario.address?.street || '';
      
      // Tratar CPF que pode vir como cpf ou document
      const cpfValue = funcionario.cpf || (funcionario as any).document || '';
      
      // Tratar dados bancários - verificar tanto bankData quanto bankInfo
      let bankData = {
        bank: '',
        agency: '',
        account: '',
        type: 'CORRENTE'
      };
      
      // Priorizar bankInfo (que vem do backend) sobre bankData
      if ((funcionario as any).bankInfo) {
        const bankInfo = (funcionario as any).bankInfo;
        bankData = {
          bank: bankInfo.bank || '',
          agency: bankInfo.agency || '',
          account: bankInfo.account || '',
          type: bankInfo.accountType || 'CORRENTE'
        };
        console.log('💰 Dados bancários encontrados em bankInfo:', bankInfo);
      } else if (funcionario.bankData) {
        bankData = {
          bank: funcionario.bankData.bank || '',
          agency: funcionario.bankData.agency || '',
          account: funcionario.bankData.account || '',
          type: funcionario.bankData.type || 'CORRENTE'
        };
        console.log('💰 Dados bancários encontrados em bankData:', funcionario.bankData);
      } else {
        console.log('⚠️ Nenhum dado bancário encontrado no funcionário');
      }
      
      console.log('💰 Dados bancários mapeados para o formulário:', bankData);
      
      setForm({
        name: funcionario.name || '',
        cpf: cpfValue,
        rg: funcionario.rg || '',
        email: funcionario.email || '',
        phone: funcionario.phone || '',
        address: addressValue,
        birthDate: funcionario.birthDate || '',
        maritalStatus: funcionario.maritalStatus || 'SINGLE',
        nationality: funcionario.nationality || 'Brasileiro',
        registrationNumber: funcionario.registrationNumber || '',
        hireDate: funcionario.hireDate || '',
        status: funcionario.status || 'ACTIVE',
        notes: funcionario.notes || '',
        position: { id: funcionario.position?.id ? String(funcionario.position.id) : '' },
        unit: { id: funcionario.unit?.id ? String(funcionario.unit.id) : '' },
        user: { id: funcionario.user?.id ? String(funcionario.user.id) : '' },
        company: { id: funcionario.company?.id ? String(funcionario.company.id) : '' },
        bankData: bankData,
        // Campos do cônjuge
        spouseName: funcionario.spouseName || '',
        spouseCpf: funcionario.spouseCpf || '',
        spouseRg: funcionario.spouseRg || '',
        spouseBirthDate: funcionario.spouseBirthDate || '',
        spousePhone: funcionario.spousePhone || '',
        spouseEmail: funcionario.spouseEmail || '',
        
        // Campos da ficha de registro
        empresaNome: funcionario.empresaNome || '',
        empresaEndereco: funcionario.empresaEndereco || '',
        empresaCnpj: funcionario.empresaCnpj || '',
        tituloEleitor: funcionario.tituloEleitor || '',
        tituloEleitorZona: funcionario.tituloEleitorZona || '',
        tituloEleitorSecao: funcionario.tituloEleitorSecao || '',
        carteiraIdentidadeOrgaoEmissor: funcionario.carteiraIdentidadeOrgaoEmissor || '',
        carteiraIdentidadeDataEmissao: funcionario.carteiraIdentidadeDataEmissao || '',
        certificadoMilitar: funcionario.certificadoMilitar || '',
        nomePai: funcionario.nomePai || '',
        nomeMae: funcionario.nomeMae || '',
        localNascimento: funcionario.localNascimento || '',
        grauInstrucao: funcionario.grauInstrucao || '',
        cbo: funcionario.cbo || '',
        salario: funcionario.salario || 0,
        salarioPorExtenso: funcionario.salarioPorExtenso || '',
        periodoPagamento: funcionario.periodoPagamento || '',
        horarioTrabalho: funcionario.horarioTrabalho || '',
        folgaSemanal: funcionario.folgaSemanal || '',
        fgtsOptante: funcionario.fgtsOptante || false,
        fgtsDataOpcao: funcionario.fgtsDataOpcao || '',
        fgtsBancoDepositario: funcionario.fgtsBancoDepositario || '',
        fgtsDataRetratacao: funcionario.fgtsDataRetratacao || '',
        pis: funcionario.pis || '',
        pisDataCadastro: funcionario.pisDataCadastro || '',
        pisBancoDepositario: funcionario.pisBancoDepositario || '',
        pisEnderecoBanco: funcionario.pisEnderecoBanco || '',
        pisCodigoBanco: funcionario.pisCodigoBanco || '',
        pisCodigoAgencia: funcionario.pisCodigoAgencia || '',
        cnhNumber: funcionario.cnhNumber || '',
        cnhExpirationDate: funcionario.cnhExpirationDate || '',
        cnhCategory: funcionario.cnhCategory || '',
        ctps: funcionario.ctps || '',
        ctpsRural: funcionario.ctpsRural || '',
        ctpsSeries: funcionario.ctpsSeries || '',
        ctpsIssueDate: funcionario.ctpsIssueDate || '',
        ctpsIssuingAgency: funcionario.ctpsIssuingAgency || '',
        carteiraModelo19: funcionario.carteiraModelo19 || '',
        registroGeralEstrangeiro: funcionario.registroGeralEstrangeiro || '',
        casadoBrasileiro: funcionario.casadoBrasileiro || false,
        nomeConjugeEstrangeiro: funcionario.nomeConjugeEstrangeiro || '',
        temFilhosBrasileiros: funcionario.temFilhosBrasileiros || false,
        quantidadeFilhosBrasileiros: funcionario.quantidadeFilhosBrasileiros || 0,
        dataChegadaBrasil: funcionario.dataChegadaBrasil || '',
        naturalizado: funcionario.naturalizado || false,
        decretoNaturalizacao: funcionario.decretoNaturalizacao || '',
        vistoFiscalizacao: funcionario.vistoFiscalizacao || '',
        assinaturaFuncionario: funcionario.assinaturaFuncionario || '',
        dataRescisao: funcionario.dataRescisao || '',
        gender: funcionario.gender || ''
      });
      
      console.log('✅ Formulário preenchido com dados do funcionário');
      console.log('📋 Dados principais:', {
        name: funcionario.name,
        cpf: cpfValue,
        email: funcionario.email,
        phone: funcionario.phone,
        position: funcionario.position?.id,
        positionName: funcionario.position?.name,
        userId: funcionario.user?.id,
        userName: funcionario.user?.name || funcionario.user?.email,
        bankData: bankData,
        address: addressValue
      });
      
      // Nota: Os selects de usuário e cargo serão preenchidos no useEffect
      // que monitora users e positions para garantir que as listas estejam carregadas
    } else if (open && !funcionario) {
      // Resetar formulário quando modal abrir sem funcionário
      console.log('🔄 Resetando formulário - nenhum funcionário selecionado');
    }
  }, [funcionario, open]);

  const loadSelectData = async () => {
    setLoadingData(true);
    try {
      console.log('📥 Carregando dados dos selects...');
      const [positionsData, unitsData, usersData, companiesData] = await Promise.all([
        positionService.getPositions(),
        unitService.getAllUnits(),
        userService.getAllUsers(),
        companyService.getAllCompanies()
      ]);
      
      console.log('✅ Dados carregados:', {
        positions: positionsData.length,
        units: unitsData.length,
        users: usersData.length,
        companies: companiesData.length
      });
      
      setPositions(positionsData);
      setUnits(unitsData);
      setUsers(usersData);
      setFilteredUsers(usersData);
      setCompanies(companiesData);
      
      // Após carregar os dados, preencher os selects se houver funcionário
      if (funcionario) {
        console.log('🔍 Funcionário encontrado, preenchendo selects...');
        console.log('👤 Funcionário user ID:', funcionario.user?.id);
        console.log('💼 Funcionário position ID:', funcionario.position?.id);
        
        // Preencher usuário selecionado - comparar IDs como strings
        if (funcionario.user?.id) {
          const userId = String(funcionario.user.id);
          const user = usersData.find(u => String(u.id) === userId);
          if (user) {
            setSelectedUser(user);
            setUserSearchTerm(user.name || user.email || '');
            console.log('✅ Usuário encontrado e selecionado:', user.name, user.id);
          } else {
            console.warn('⚠️ Usuário não encontrado na lista');
            console.warn('   Procurando por:', userId);
            console.warn('   IDs disponíveis:', usersData.map(u => String(u.id)));
            // Mesmo não encontrando, definir o ID no formulário para que apareça quando a lista carregar
            setForm(prev => ({ ...prev, user: { id: userId } }));
          }
        } else {
          console.log('ℹ️ Funcionário não tem usuário associado');
        }
        
        // Preencher cargo selecionado - comparar IDs como strings
        if (funcionario.position?.id) {
          const positionId = String(funcionario.position.id);
          const position = positionsData.find(p => String(p.id) === positionId);
          if (position) {
            setSelectedPosition(position);
            console.log('✅ Cargo encontrado e selecionado:', position.name, position.id);
          } else {
            console.warn('⚠️ Cargo não encontrado na lista');
            console.warn('   Procurando por:', positionId);
            console.warn('   IDs disponíveis:', positionsData.map(p => String(p.id)));
            // Mesmo não encontrando, definir o ID no formulário para que apareça quando a lista carregar
            setForm(prev => ({ ...prev, position: { id: positionId } }));
          }
        } else {
          console.log('ℹ️ Funcionário não tem cargo associado');
        }
        
        // Preencher empresa selecionada - comparar IDs como strings
        if (funcionario.company?.id) {
          const companyId = String(funcionario.company.id);
          const company = companiesData.find(c => String(c.id) === companyId);
          if (company) {
            setSelectedCompany(company);
            console.log('✅ Empresa encontrada e selecionada:', company.name, company.id);
          } else {
            console.warn('⚠️ Empresa não encontrada na lista');
            console.warn('   Procurando por:', companyId);
            console.warn('   IDs disponíveis:', companiesData.map(c => String(c.id)));
          }
        } else {
          console.log('ℹ️ Funcionário não tem empresa associada');
        }
      }
    } catch (err) {
      console.error('❌ Erro ao carregar dados dos selects:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle bankData fields
    if (name.startsWith('bankData.')) {
      const field = name.split('.')[1];
      setForm((prev) => ({
        ...prev,
        bankData: {
          ...(prev.bankData || { bank: '', agency: '', account: '', type: 'CORRENTE' }),
          [field]: value
        }
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (field: string, value: string) => {
    if (value) {
      const stringValue = String(value);
      setForm((prev) => ({ 
        ...prev, 
        [field]: { id: stringValue } 
      }));
      
      // Atualizar estados selecionados
      if (field === 'user') {
        const user = users.find(u => String(u.id) === stringValue);
        if (user) {
          setSelectedUser(user);
          setUserSearchTerm(user.name || user.email || '');
        }
      } else if (field === 'position') {
        const position = positions.find(p => String(p.id) === stringValue);
        if (position) {
          setSelectedPosition(position);
        }
      }
    } else {
      setForm((prev) => {
        const newForm = { ...prev };
        if (field === 'position') {
          newForm.position = { id: '' };
          setSelectedPosition(null);
        } else if (field === 'unit') {
          newForm.unit = { id: '' };
        } else if (field === 'user') {
          newForm.user = { id: '' };
          setSelectedUser(null);
          setUserSearchTerm('');
        } else if (field === 'company') {
          newForm.company = { id: '' };
          setSelectedCompany(null);
        }
        return newForm;
      });
    }
  };
  
  const handleCompanySelect = (companyId: string) => {
    if (companyId === 'none' || companyId === '') {
      setSelectedCompany(null);
      setForm(prev => ({ ...prev, company: { id: '' } }));
    } else {
      const company = companies.find(c => c.id === companyId);
      if (company) {
        setSelectedCompany(company);
        setForm(prev => ({ ...prev, company: { id: company.id } }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!funcionario) return;
    
    // Validações
    if (!form.address) {
      setError('Endereço é obrigatório para editar um funcionário.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await employeeService.updateEmployee(funcionario.id, form);
      toast({
        title: "Sucesso",
        description: "Funcionário atualizado com sucesso!",
      });
      onSuccess();
    } catch (err: any) {
      console.error('Erro ao atualizar funcionário:', err);
      
      // Tratar erros específicos
      if (err.message.includes('CPF já cadastrado')) {
        setError('CPF já cadastrado para outro funcionário');
        toast({
          title: "CPF Duplicado",
          description: "Este CPF já está cadastrado para outro funcionário.",
          variant: "destructive"
        });
      } else if (err.message.includes('Email já cadastrado')) {
        setError('Email já cadastrado para outro funcionário');
        toast({
          title: "Email Duplicado",
          description: "Este email já está cadastrado para outro funcionário.",
          variant: "destructive"
        });
      } else {
        setError('Erro ao atualizar funcionário.');
        toast({
          title: "Erro",
          description: err.message || "Não foi possível atualizar o funcionário.",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    if (funcionario) {
      setForm({
        name: funcionario.name || '',
        cpf: funcionario.cpf || '',
        rg: funcionario.rg || '',
        email: funcionario.email || '',
        phone: funcionario.phone || '',
        address: funcionario.address?.street || '',
        birthDate: funcionario.birthDate || '',
        maritalStatus: funcionario.maritalStatus || 'SINGLE',
        nationality: funcionario.nationality || 'Brasileiro',
        registrationNumber: funcionario.registrationNumber || '',
        hireDate: funcionario.hireDate || '',
        status: funcionario.status || 'ACTIVE',
        notes: funcionario.notes || '',
        position: { id: funcionario.position?.id || '' },
        unit: { id: funcionario.unit?.id || '' },
        user: { id: funcionario.user?.id || '' }
      });
    }
    setError(null);
    setUserSearchTerm('');
  };

  const handleCargoCreated = (cargo: { id: string; name: string; description: string }) => {
    // Adicionar o novo cargo à lista
    setPositions(prev => [...prev, cargo]);
    // Selecionar automaticamente o novo cargo
    setForm(prev => ({ ...prev, position: { id: cargo.id } }));
  };

  if (!funcionario) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full p-2 sm:p-4 overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Editar Funcionário</DialogTitle>
          <p className="text-sm text-gray-400">
            Edite os dados do funcionário. Campos marcados com * são obrigatórios.
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seção: Relacionamentos */}
          <div className="space-y-4 bg-[#363636] p-4 rounded-lg">
            <h3 className="text-lg font-semibold flex items-center text-white">
              <UserIcon className="mr-2" size={20} />
              Relacionamentos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Seleção de Usuário */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-200">
                  Usuário do Sistema
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    placeholder="Buscar usuário por nome, email ou username..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select 
                  value={form.user?.id ? String(form.user.id) : undefined} 
                  onValueChange={(value) => handleSelectChange('user', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário">
                      {selectedUser ? (
                        <div className="flex flex-col text-left">
                          <span className="font-medium">{selectedUser.name}</span>
                          <span className="text-xs text-gray-500">
                            {selectedUser.email}
                          </span>
                        </div>
                      ) : form.user?.id ? (
                        <span className="text-gray-400">Carregando usuário...</span>
                      ) : (
                        'Selecione um usuário'
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <SelectItem key={user.id} value={String(user.id)}>
                          <div className="flex flex-col">
                            <span className="font-medium">{user.name}</span>
                            <span className="text-xs text-gray-500">
                              {user.email} • {user.username} • {user.role}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        Nenhum usuário encontrado
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-300">
                  O usuário selecionado será associado ao funcionário para acesso ao sistema. (Opcional)
                </p>
              </div>

                             {/* Seleção de Cargo */}
               <div className="space-y-2">
                 <Label className="text-sm font-medium text-gray-200">
                   Cargo
                 </Label>
                 <div className="flex gap-2">
                   <Select 
                     value={form.position?.id ? String(form.position.id) : undefined} 
                     onValueChange={(value) => handleSelectChange('position', value)}
                     className="flex-1"
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Selecione um cargo">
                         {selectedPosition ? (
                           <div className="flex items-center">
                             <Briefcase className="mr-2" size={16} />
                             <div className="flex flex-col text-left">
                               <span className="font-medium">{selectedPosition.name}</span>
                               {selectedPosition.description && (
                                 <span className="text-xs text-gray-500">{selectedPosition.description}</span>
                               )}
                             </div>
                           </div>
                         ) : form.position?.id ? (
                           <span className="text-gray-400">Carregando cargo...</span>
                         ) : (
                           'Selecione um cargo'
                         )}
                       </SelectValue>
                     </SelectTrigger>
                     <SelectContent>
                       {positions.length > 0 ? (
                         positions.map((position) => (
                           <SelectItem key={position.id} value={String(position.id)}>
                             <div className="flex items-center">
                               <Briefcase className="mr-2" size={16} />
                               <div className="flex flex-col">
                                 <span className="font-medium">{position.name}</span>
                                 {position.description && (
                                   <span className="text-xs text-gray-500">{position.description}</span>
                                 )}
                               </div>
                             </div>
                           </SelectItem>
                         ))
                       ) : (
                         <div className="px-3 py-2 text-sm text-gray-500">
                           Nenhum cargo disponível
                         </div>
                       )}
                     </SelectContent>
                   </Select>
                   <Button
                     type="button"
                     variant="outline"
                     size="sm"
                     onClick={() => setNovoCargoModalOpen(true)}
                     className="px-3 flex-shrink-0"
                     title="Criar novo cargo"
                   >
                     <Plus size={16} />
                   </Button>
                 </div>
                 <p className="text-xs text-gray-300">
                   Selecione um cargo existente ou crie um novo.
                 </p>
               </div>
            </div>
          </div>

          {/* Seção: Informações Pessoais */}
          <div className="space-y-4 bg-[#363636] p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white">Informações Pessoais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-200">Nome Completo *</Label>
                <Input 
                  name="name" 
                  value={form.name} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">CPF *</Label>
                <Input 
                  name="cpf" 
                  value={form.cpf} 
                  onChange={handleChange} 
                  required 
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">RG *</Label>
                <Input 
                  name="rg" 
                  value={form.rg} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Data de Nascimento *</Label>
                <Input 
                  name="birthDate" 
                  type="date" 
                  value={form.birthDate} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Estado Civil</Label>
                <Select 
                  value={form.maritalStatus} 
                  onValueChange={(value) => setForm(prev => ({ ...prev, maritalStatus: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o estado civil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SINGLE">Solteiro</SelectItem>
                    <SelectItem value="MARRIED">Casado</SelectItem>
                    <SelectItem value="DIVORCED">Divorciado</SelectItem>
                    <SelectItem value="WIDOWED">Viúvo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Nacionalidade</Label>
                <Input 
                  name="nationality" 
                  value={form.nationality} 
                  onChange={handleChange} 
                />
              </div>
            </div>
          </div>

          {/* Seção: Informações do Cônjuge - Exibida apenas quando estado civil for "Casado" */}
          {form.maritalStatus === 'MARRIED' && (
            <div className="space-y-4 bg-[#363636] p-4 rounded-lg border-l-4 border-yellow-500">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-yellow-500" />
                Informações do Cônjuge
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-200">Nome Completo do Cônjuge *</Label>
                  <Input 
                    name="spouseName" 
                    value={form.spouseName} 
                    onChange={handleChange} 
                    placeholder="Digite o nome completo do cônjuge"
                    required 
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-200">CPF do Cônjuge *</Label>
                  <Input 
                    name="spouseCpf" 
                    value={form.spouseCpf} 
                    onChange={handleChange} 
                    placeholder="000.000.000-00"
                    required 
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-200">RG do Cônjuge</Label>
                  <Input 
                    name="spouseRg" 
                    value={form.spouseRg} 
                    onChange={handleChange} 
                    placeholder="Digite o RG do cônjuge"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-200">Data de Nascimento do Cônjuge</Label>
                  <Input 
                    name="spouseBirthDate" 
                    type="date" 
                    value={form.spouseBirthDate} 
                    onChange={handleChange} 
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-200">Telefone do Cônjuge</Label>
                  <Input 
                    name="spousePhone" 
                    value={form.spousePhone} 
                    onChange={handleChange} 
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-200">Email do Cônjuge</Label>
                  <Input 
                    name="spouseEmail" 
                    type="email" 
                    value={form.spouseEmail} 
                    onChange={handleChange} 
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Seção: Informações de Contato */}
          <div className="space-y-4 bg-[#363636] p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white">Informações de Contato</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-200">Email *</Label>
                <Input 
                  name="email" 
                  type="email" 
                  value={form.email} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Telefone *</Label>
                <Input 
                  name="phone" 
                  value={form.phone} 
                  onChange={handleChange} 
                  required 
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm font-medium text-gray-200">Endereço *</Label>
                <Input 
                  name="address" 
                  value={form.address} 
                  onChange={handleChange} 
                  required 
                  placeholder="Rua, número, bairro, cidade - estado, CEP"
                />
              </div>
            </div>
          </div>

          {/* Seção: Informações da Empresa */}
          <div className="space-y-4 bg-[#363636] p-4 rounded-lg border-l-4 border-blue-500">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-500" />
              Informações da Empresa
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-200">Nome da Empresa</Label>
                <Input 
                  name="empresaNome" 
                  value={form.empresaNome} 
                  onChange={handleChange} 
                  placeholder="Nome da empresa contratante"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">CNPJ/CEI</Label>
                <Input 
                  name="empresaCnpj" 
                  value={form.empresaCnpj} 
                  onChange={handleChange} 
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm font-medium text-gray-200">Endereço da Empresa</Label>
                <Input 
                  name="empresaEndereco" 
                  value={form.empresaEndereco} 
                  onChange={handleChange} 
                  placeholder="Endereço completo da empresa"
                />
              </div>
            </div>
          </div>

          {/* Seção: Documentos Pessoais */}
          <div className="space-y-4 bg-[#363636] p-4 rounded-lg border-l-4 border-green-500">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-green-500" />
              Documentos Pessoais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-200">CTPS</Label>
                <Input 
                  name="ctps" 
                  value={form.ctps} 
                  onChange={handleChange} 
                  placeholder="Número da CTPS"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Série CTPS</Label>
                <Input 
                  name="ctpsSeries" 
                  value={form.ctpsSeries} 
                  onChange={handleChange} 
                  placeholder="Série da CTPS"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Título de Eleitor</Label>
                <Input 
                  name="tituloEleitor" 
                  value={form.tituloEleitor} 
                  onChange={handleChange} 
                  placeholder="Número do título de eleitor"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Zona Eleitoral</Label>
                <Input 
                  name="tituloEleitorZona" 
                  value={form.tituloEleitorZona} 
                  onChange={handleChange} 
                  placeholder="Zona eleitoral"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Órgão Emissor RG</Label>
                <Input 
                  name="carteiraIdentidadeOrgaoEmissor" 
                  value={form.carteiraIdentidadeOrgaoEmissor} 
                  onChange={handleChange} 
                  placeholder="SSP, IFP, etc."
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Data Emissão RG</Label>
                <Input 
                  name="carteiraIdentidadeDataEmissao" 
                  type="date" 
                  value={form.carteiraIdentidadeDataEmissao} 
                  onChange={handleChange} 
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Certificado Militar</Label>
                <Input 
                  name="certificadoMilitar" 
                  value={form.certificadoMilitar} 
                  onChange={handleChange} 
                  placeholder="Número do certificado militar"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">CNH</Label>
                <Input 
                  name="cnhNumber" 
                  value={form.cnhNumber} 
                  onChange={handleChange} 
                  placeholder="Número da CNH"
                />
              </div>
            </div>
          </div>

          {/* Seção: Informações Familiares */}
          <div className="space-y-4 bg-[#363636] p-4 rounded-lg border-l-4 border-purple-500">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-purple-500" />
              Informações Familiares
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-200">Nome do Pai</Label>
                <Input 
                  name="nomePai" 
                  value={form.nomePai} 
                  onChange={handleChange} 
                  placeholder="Nome completo do pai"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Nome da Mãe</Label>
                <Input 
                  name="nomeMae" 
                  value={form.nomeMae} 
                  onChange={handleChange} 
                  placeholder="Nome completo da mãe"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Local de Nascimento</Label>
                <Input 
                  name="localNascimento" 
                  value={form.localNascimento} 
                  onChange={handleChange} 
                  placeholder="Cidade, Estado"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Grau de Instrução</Label>
                <Input 
                  name="grauInstrucao" 
                  value={form.grauInstrucao} 
                  onChange={handleChange} 
                  placeholder="Ensino médio completo, etc."
                />
              </div>
            </div>
          </div>

          {/* Seção: Informações Profissionais */}
          <div className="space-y-4 bg-[#363636] p-4 rounded-lg">
            <h3 className="text-lg font-semibold flex items-center text-white">
              <Building className="mr-2" size={20} />
              Informações Profissionais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-200">Número de Registro *</Label>
                <Input 
                  name="registrationNumber" 
                  value={form.registrationNumber} 
                  onChange={handleChange} 
                  required 
                  placeholder="EMP001"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Data de Admissão *</Label>
                <Input 
                  name="hireDate" 
                  type="date" 
                  value={form.hireDate} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">CBO</Label>
                <Input 
                  name="cbo" 
                  value={form.cbo} 
                  onChange={handleChange} 
                  placeholder="Código Brasileiro de Ocupações"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Salário</Label>
                <Input 
                  name="salario" 
                  type="number" 
                  step="0.01"
                  value={form.salario} 
                  onChange={handleChange} 
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Período de Pagamento</Label>
                <Input 
                  name="periodoPagamento" 
                  value={form.periodoPagamento} 
                  onChange={handleChange} 
                  placeholder="Mensal, Quinzenal, etc."
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Status *</Label>
                <Select 
                  value={form.status} 
                  onValueChange={(value) => setForm(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Ativo</SelectItem>
                    <SelectItem value="INACTIVE">Inativo</SelectItem>
                    <SelectItem value="VACATION">Férias</SelectItem>
                    <SelectItem value="TERMINATED">Demitido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm font-medium text-gray-200">Horário de Trabalho</Label>
                <Input 
                  name="horarioTrabalho" 
                  value={form.horarioTrabalho} 
                  onChange={handleChange} 
                  placeholder="Ex: 08h às 17h"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Folga Semanal</Label>
                <Input 
                  name="folgaSemanal" 
                  value={form.folgaSemanal} 
                  onChange={handleChange} 
                  placeholder="Ex: Domingo"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Unidade (Opcional)</Label>
                <Select 
                  value={form.unit?.id || ''} 
                  onValueChange={(value) => handleSelectChange('unit', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        <div className="flex items-center">
                          <Building className="mr-2" size={16} />
                          {unit.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Empresa (Opcional)</Label>
                <Select 
                  value={selectedCompany?.id || form.company?.id || 'none'} 
                  onValueChange={handleCompanySelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa">
                      {selectedCompany ? (
                        <div className="flex flex-col text-left">
                          <span className="font-medium">
                            {selectedCompany.sigla ? selectedCompany.sigla.toUpperCase() : selectedCompany.name}
                          </span>
                          {selectedCompany.sigla && selectedCompany.name && (
                            <span className="text-xs text-gray-500">{selectedCompany.name}</span>
                          )}
                        </div>
                      ) : form.company?.id ? (
                        <span className="text-gray-400">Carregando empresa...</span>
                      ) : (
                        'Nenhuma empresa'
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-gray-400">Nenhuma empresa</span>
                    </SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {company.sigla ? company.sigla.toUpperCase() : company.name}
                          </span>
                          {company.sigla && company.name && (
                            <span className="text-xs text-gray-500">{company.name}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Seção: Dados Bancários */}
          <div className="space-y-4 bg-[#363636] p-4 rounded-lg border-l-4 border-blue-500">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-500" />
              Dados Bancários
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-200">Banco</Label>
                <Input 
                  name="bankData.bank" 
                  value={form.bankData?.bank || ''} 
                  onChange={handleChange} 
                  placeholder="Nome do banco"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Agência</Label>
                <Input 
                  name="bankData.agency" 
                  value={form.bankData?.agency || ''} 
                  onChange={handleChange} 
                  placeholder="0000"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Conta Corrente</Label>
                <Input 
                  name="bankData.account" 
                  value={form.bankData?.account || ''} 
                  onChange={handleChange} 
                  placeholder="00000-0"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Tipo de Conta</Label>
                <Select 
                  value={form.bankData?.type || 'CORRENTE'} 
                  onValueChange={(value) => setForm(prev => ({ 
                    ...prev, 
                    bankData: {
                      ...(prev.bankData || { bank: '', agency: '', account: '', type: 'CORRENTE' }),
                      type: value
                    }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de conta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CORRENTE">Conta Corrente</SelectItem>
                    <SelectItem value="POUPANCA">Poupança</SelectItem>
                    <SelectItem value="SALARIO">Conta Salário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Seção: FGTS e PIS */}
          <div className="space-y-4 bg-[#363636] p-4 rounded-lg border-l-4 border-orange-500">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Building className="h-5 w-5 text-orange-500" />
              FGTS e PIS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-200">É Optante do FGTS?</Label>
                <Select 
                  value={form.fgtsOptante ? 'true' : 'false'} 
                  onValueChange={(value) => setForm(prev => ({ ...prev, fgtsOptante: value === 'true' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Sim</SelectItem>
                    <SelectItem value="false">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Data da Opção FGTS</Label>
                <Input 
                  name="fgtsDataOpcao" 
                  type="date" 
                  value={form.fgtsDataOpcao} 
                  onChange={handleChange} 
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Banco Depositário FGTS</Label>
                <Input 
                  name="fgtsBancoDepositario" 
                  value={form.fgtsBancoDepositario} 
                  onChange={handleChange} 
                  placeholder="Nome do banco"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">PIS</Label>
                <Input 
                  name="pis" 
                  value={form.pis} 
                  onChange={handleChange} 
                  placeholder="Número do PIS"
                />
              </div>
            </div>
          </div>

          {/* Seção: Observações */}
          <div className="space-y-4 bg-[#363636] p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white">Observações</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-200">Observações</Label>
                <textarea
                  name="notes"
                  value={form.notes || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full rounded px-3 py-2 resize-none border border-gray-600 bg-gray-700 text-white"
                  placeholder="Observações sobre o funcionário..."
                />
              </div>
            </div>
          </div>
         
          {error && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}
         
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={resetForm}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Restaurar Dados
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || loadingData || !form.position?.id}
              className="w-full sm:w-auto"
            >
              {loading ? 'Salvando...' : 'Atualizar Funcionário'}
            </Button>
          </DialogFooter>
                 </form>
       </DialogContent>
       
       {/* Modal de Novo Cargo */}
       <NovoCargoModal
         open={novoCargoModalOpen}
         onClose={() => setNovoCargoModalOpen(false)}
         onCargoCreated={handleCargoCreated}
       />
     </Dialog>
   );
 };

export default FuncionarioEditModal;
