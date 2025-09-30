import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { userService } from '@/services/userService';
import { User, CreateUserDTO } from '@/types/user';
import { roleService, Role } from '@/services/roleService';
import { UserPlus, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CriarUsuarioPadraoModalProps {
  open: boolean;
  onClose: () => void;
  onUsuarioCreated: (user: User) => void;
  positionName: string;
  employeeName: string;
  employeeCpf: string;
  employeePhone: string;
}

const CriarUsuarioPadraoModal: React.FC<CriarUsuarioPadraoModalProps> = ({
  open,
  onClose,
  onUsuarioCreated,
  positionName,
  employeeName,
  employeeCpf,
  employeePhone
}) => {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    roleId: '',
    isActive: true,
    sendEmailNotification: true
  });
  
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();

  // Carregar roles disponíveis
  React.useEffect(() => {
    if (open) {
      loadRoles();
      generateDefaultCredentials();
    }
  }, [open, employeeName, employeeCpf]);

  const loadRoles = async () => {
    setLoadingRoles(true);
    try {
      const rolesData = await roleService.getAllRoles();
      setRoles(rolesData);
    } catch (error) {
      console.error('Erro ao carregar roles:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as permissões.',
        variant: 'destructive'
      });
    } finally {
      setLoadingRoles(false);
    }
  };

  const generateDefaultCredentials = () => {
    if (employeeName && employeeCpf) {
      // Gerar username baseado no nome e CPF
      const firstName = employeeName.split(' ')[0].toLowerCase();
      const lastName = employeeName.split(' ').pop()?.toLowerCase() || '';
      const cpfNumbers = employeeCpf.replace(/\D/g, '');
      const cpfSuffix = cpfNumbers.slice(-4);
      
      const generatedUsername = `${firstName}.${lastName}.${cpfSuffix}`;
      const generatedEmail = `${firstName}.${lastName}@securedguard.com`;
      
      setForm(prev => ({
        ...prev,
        username: generatedUsername,
        email: generatedEmail
      }));
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const validateForm = () => {
    if (!form.username.trim()) {
      setError('Nome de usuário é obrigatório');
      return false;
    }
    
    if (!form.email.trim()) {
      setError('Email é obrigatório');
      return false;
    }
    
    if (!form.email.includes('@')) {
      setError('Email deve ter um formato válido');
      return false;
    }
    
    if (!form.password.trim()) {
      setError('Senha é obrigatória');
      return false;
    }
    
    if (form.password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres');
      return false;
    }
    
    if (form.password !== form.confirmPassword) {
      setError('Senhas não coincidem');
      return false;
    }
    
    if (!form.roleId) {
      setError('Selecione uma permissão');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const userData: CreateUserDTO = {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        roleId: form.roleId,
        isActive: form.isActive,
        name: employeeName,
        phone: employeePhone
      };
      
      const newUser = await userService.createUser(userData);
      
      toast({
        title: 'Sucesso!',
        description: 'Usuário criado com sucesso.',
      });
      
      onUsuarioCreated(newUser);
      onClose();
      
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      setError(error.response?.data?.message || 'Erro ao criar usuário');
      
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao criar usuário',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      roleId: '',
      isActive: true,
      sendEmailNotification: true
    });
    setError(null);
    onClose();
  };

  // Selecionar role padrão baseada na posição
  React.useEffect(() => {
    if (roles.length > 0 && !form.roleId) {
      // Tentar encontrar uma role baseada na posição
      const defaultRole = roles.find(role => 
        role.name.toLowerCase().includes('funcionario') ||
        role.name.toLowerCase().includes('vigilante') ||
        role.name.toLowerCase().includes('operacional')
      ) || roles[0];
      
      if (defaultRole) {
        setForm(prev => ({
          ...prev,
          roleId: defaultRole.id
        }));
      }
    }
  }, [roles, form.roleId]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Criar Usuário Padrão
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Informações do Funcionário */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="font-medium text-sm text-gray-700 mb-2">Funcionário</h4>
            <div className="text-sm space-y-1">
              <p><strong>Nome:</strong> {employeeName}</p>
              <p><strong>CPF:</strong> {employeeCpf}</p>
              <p><strong>Posição:</strong> {positionName}</p>
            </div>
          </div>

          {/* Nome de Usuário */}
          <div className="space-y-2">
            <Label htmlFor="username">Nome de Usuário</Label>
            <Input
              id="username"
              value={form.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="Digite o nome de usuário"
              disabled={loading}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Digite o email"
              disabled={loading}
            />
          </div>

          {/* Senha */}
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="Digite a senha"
              disabled={loading}
            />
          </div>

          {/* Confirmar Senha */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              placeholder="Confirme a senha"
              disabled={loading}
            />
          </div>

          {/* Permissão */}
          <div className="space-y-2">
            <Label htmlFor="role">Permissão</Label>
            <Select
              value={form.roleId}
              onValueChange={(value) => handleInputChange('roleId', value)}
              disabled={loading || loadingRoles}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingRoles ? "Carregando..." : "Selecione uma permissão"} />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Opções */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(checked) => handleInputChange('isActive', checked as boolean)}
                disabled={loading}
              />
              <Label htmlFor="isActive" className="text-sm">
                Usuário ativo
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendEmail"
                checked={form.sendEmailNotification}
                onCheckedChange={(checked) => handleInputChange('sendEmailNotification', checked as boolean)}
                disabled={loading}
              />
              <Label htmlFor="sendEmail" className="text-sm">
                Enviar email com credenciais
              </Label>
            </div>
          </div>

          {/* Erro */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-600">{error}</span>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || loadingRoles}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Criar Usuário
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CriarUsuarioPadraoModal;
