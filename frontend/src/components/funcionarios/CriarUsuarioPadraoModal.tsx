import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { userService, User as ServiceUser } from '@/services/userService';
import { User } from '@/types/user';
import { roleService, Role } from '@/services/roleService';
import { 
  UserPlus, Loader2, CheckCircle, AlertCircle, User as UserIcon, 
  Mail, Lock, Shield, Eye, EyeOff, Sparkles, KeyRound, RefreshCw 
} from 'lucide-react';
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

/** Senha padrão: CPF@PromoverAAAA (ex.: 14705707699@Promover2026) */
export function buildDefaultEmployeePassword(cpf: string): string {
  const digits = (cpf || '').replace(/\D/g, '');
  const year = new Date().getFullYear();
  if (digits.length === 11) {
    return `${digits}@Promover${year}`;
  }
  return `usuario@Promover${year}`;
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [existingUserId, setExistingUserId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const isUpdateMode = !!existingUserId;

  React.useEffect(() => {
    if (open) {
      loadRoles();
      generateDefaultCredentials();
      detectExistingUser();
    } else {
      setExistingUserId(null);
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
    const cpfNumbers = (employeeCpf || '').replace(/\D/g, '');
    const firstName = (employeeName || 'usuario').trim().split(/\s+/)[0].toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '') || 'usuario';

    const generatedUsername = cpfNumbers.length === 11 ? cpfNumbers : firstName;
    const generatedEmail = cpfNumbers.length === 11
      ? `${cpfNumbers}@securedguard.local`
      : `${firstName}.${Date.now().toString().slice(-4)}@securedguard.local`;
    const defaultPassword = buildDefaultEmployeePassword(employeeCpf);

    setForm(prev => ({
      ...prev,
      username: generatedUsername,
      email: generatedEmail,
      password: defaultPassword,
      confirmPassword: defaultPassword,
    }));
  };

  const detectExistingUser = async () => {
    const cpfNumbers = (employeeCpf || '').replace(/\D/g, '');
    if (cpfNumbers.length !== 11) {
      setExistingUserId(null);
      return;
    }
    try {
      const users = await userService.searchUsers(cpfNumbers);
      const match = (users || []).find(
        (u) =>
          u.username === cpfNumbers ||
          (u.email || '').toLowerCase() === `${cpfNumbers}@securedguard.local`
      );
      if (match?.id) {
        setExistingUserId(match.id);
        setForm((prev) => ({
          ...prev,
          username: match.username || prev.username,
          email: match.email || prev.email,
          isActive: match.active !== false,
        }));
      } else {
        setExistingUserId(null);
      }
    } catch {
      setExistingUserId(null);
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

  const buildPayload = (selectedRoleName: string) => {
    const whatsappDigits = employeePhone ? employeePhone.replace(/\D/g, '') : '';
    return {
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
      roles: [selectedRoleName],
      active: form.isActive,
      name: (employeeName || '').trim() || form.username.trim(),
      ...(whatsappDigits.length >= 9 ? { whatsapp: whatsappDigits } : {}),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const selectedRole = roles.find(r => r.id === form.roleId);
      if (!selectedRole) {
        setError('Role selecionado não encontrado');
        return;
      }

      const userData = buildPayload(selectedRole.name);
      let savedUser: ServiceUser;

      if (existingUserId) {
        savedUser = await userService.updateUser(existingUserId, userData);
        toast({
          title: 'Usuário atualizado',
          description: 'Credenciais e permissões atualizadas com sucesso.',
        });
      } else {
        try {
          savedUser = await userService.createUser(userData);
          toast({
            title: 'Sucesso!',
            description: 'Usuário criado com sucesso.',
          });
        } catch (createErr: any) {
          const msg = String(createErr.response?.data?.message || '');
          const alreadyExists =
            /já está em uso|já existe|already exists|duplicate/i.test(msg);

          if (!alreadyExists) {
            throw createErr;
          }

          // Usuário já existe: localizar e atualizar senha/dados
          const users = await userService.searchUsers(form.username.trim());
          const match = (users || []).find(
            (u) =>
              u.username === form.username.trim() ||
              (u.email || '').toLowerCase() === form.email.trim().toLowerCase()
          );
          if (!match?.id) {
            throw createErr;
          }
          setExistingUserId(match.id);
          savedUser = await userService.updateUser(match.id, userData);
          toast({
            title: 'Usuário atualizado',
            description: 'O usuário já existia; senha e dados foram atualizados.',
          });
        }
      }
      
      onUsuarioCreated(savedUser as unknown as User);
      onClose();
      
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      
      let errorMessage = isUpdateMode ? 'Erro ao atualizar usuário' : 'Erro ao criar usuário';
      const data = error.response?.data;
      const fieldErrors = data?.fieldErrors;
      
      if (fieldErrors && typeof fieldErrors === 'object') {
        errorMessage = Object.values(fieldErrors as Record<string, string>).filter(Boolean).join(' · ');
      } else if (Array.isArray(data?.errors) && data.errors.length > 0) {
        errorMessage = data.errors
          .map((e: { defaultMessage?: string; message?: string } | string) =>
            typeof e === 'string' ? e : (e.defaultMessage || e.message)
          )
          .filter(Boolean)
          .join(' · ');
      } else if (typeof data?.message === 'string' && data.message !== 'Dados inválidos fornecidos') {
        errorMessage = data.message;
      } else if (typeof data?.error === 'string' && data.error !== 'VALIDATION_ERROR') {
        errorMessage = data.error;
      } else if (typeof error?.message === 'string' && error.message.includes('Backend')) {
        errorMessage = error.message;
      }
      
      setError(errorMessage || 'Dados inválidos fornecidos');
      
      toast({
        title: isUpdateMode ? 'Erro ao atualizar usuário' : 'Erro ao criar usuário',
        description: errorMessage || 'Dados inválidos fornecidos',
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
    setExistingUserId(null);
    setError(null);
    onClose();
  };

  React.useEffect(() => {
    if (roles.length > 0 && !form.roleId) {
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

  const passwordHint = buildDefaultEmployeePassword(employeeCpf);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) handleClose(); }}>
      <DialogContent className="max-w-2xl w-full max-h-[95vh] overflow-hidden p-0 mx-4 sm:mx-0 flex flex-col gap-0">
        <DialogHeader className="bg-gradient-to-r from-seguranca-red to-seguranca-yellow p-4 sm:p-6 pr-12 text-white shrink-0">
          <DialogTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl font-bold">
            <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg">
              {isUpdateMode ? <RefreshCw className="h-4 w-4 sm:h-6 sm:w-6" /> : <UserPlus className="h-4 w-4 sm:h-6 sm:w-6" />}
            </div>
            <span className="truncate">
              {isUpdateMode ? 'Atualizar Usuário Padrão' : 'Criar Usuário Padrão'}
            </span>
          </DialogTitle>
          <DialogDescription className="text-white/90 text-sm sm:text-base mt-1">
            {isUpdateMode
              ? 'Usuário já existe — você pode alterar senha, permissão e dados'
              : 'Configure as credenciais de acesso para o funcionário'}
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto min-h-0 flex-1">
          <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
            <div className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="p-1.5 sm:p-2 bg-seguranca-red/20 rounded-lg">
                  <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-red" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-white">Informações do Funcionário</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="space-y-1">
                  <Label className="text-xs sm:text-sm font-medium text-gray-300">Nome</Label>
                  <p className="text-white font-medium text-sm sm:text-base break-words">{employeeName}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs sm:text-sm font-medium text-gray-300">CPF</Label>
                  <p className="text-white font-mono text-sm sm:text-base">{employeeCpf}</p>
                </div>
                <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                  <Label className="text-xs sm:text-sm font-medium text-gray-300">Posição</Label>
                  <Badge className="bg-seguranca-yellow/20 text-seguranca-yellow border-seguranca-yellow/30 text-xs sm:text-sm">
                    {positionName}
                  </Badge>
                </div>
              </div>
              {isUpdateMode && (
                <Badge className="mt-3 bg-amber-500/20 text-amber-300 border-amber-500/40">
                  Usuário já cadastrado — modo atualização
                </Badge>
              )}
            </div>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="p-1.5 sm:p-2 bg-seguranca-yellow/20 rounded-lg">
                  <KeyRound className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-yellow" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-white">Credenciais de Acesso</h3>
              </div>
              <p className="text-xs text-gray-400 -mt-2 mb-2">
                Padrão: <span className="text-seguranca-yellow font-mono">usuário = CPF</span>,{' '}
                <span className="text-seguranca-yellow font-mono">senha = CPF@Promover{new Date().getFullYear()}</span>
                {passwordHint ? <> (ex.: <span className="font-mono text-gray-300">{passwordHint}</span>)</> : null}
                , nome = funcionário.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-xs sm:text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2">
                    <UserIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">Nome de Usuário</span>
                  </Label>
                  <Input
                    id="username"
                    value={form.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    placeholder="Digite o nome de usuário"
                    disabled={loading}
                    className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs sm:text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2">
                    <Mail className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">Email</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Digite o email"
                    disabled={loading}
                    className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs sm:text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2">
                    <Lock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">Senha</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Digite a senha"
                      disabled={loading}
                      className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow pr-10 text-sm sm:text-base h-10 sm:h-11"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-2 sm:px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs sm:text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2">
                    <Lock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">Confirmar Senha</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder="Confirme a senha"
                      disabled={loading}
                      className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow pr-10 text-sm sm:text-base h-10 sm:h-11"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-2 sm:px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={loading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="p-1.5 sm:p-2 bg-seguranca-red/20 rounded-lg">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-red" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-white">Permissões e Configurações</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-xs sm:text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2">
                  <Shield className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="truncate">Permissão</span>
                </Label>
                <Select
                  value={form.roleId}
                  onValueChange={(value) => handleInputChange('roleId', value)}
                  disabled={loading || loadingRoles}
                >
                  <SelectTrigger className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow h-10 sm:h-11 text-sm sm:text-base">
                    <SelectValue placeholder={loadingRoles ? "Carregando..." : "Selecione uma permissão"} />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-graphite border-gray-600">
                    {roles.map((role) => (
                      <SelectItem 
                        key={role.id} 
                        value={role.id}
                        className="text-seguranca-lightgray hover:bg-gray-700 focus:bg-gray-700 text-sm sm:text-base"
                      >
                        <div className="flex items-center gap-2">
                          <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="truncate">{role.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="flex items-center space-x-2 sm:space-x-3 p-2.5 sm:p-3 bg-seguranca-graphite rounded-lg border border-gray-600">
                  <Checkbox
                    id="isActive"
                    checked={form.isActive}
                    onCheckedChange={(checked) => handleInputChange('isActive', checked as boolean)}
                    disabled={loading}
                    className="border-gray-500 data-[state=checked]:bg-seguranca-yellow data-[state=checked]:border-seguranca-yellow h-4 w-4 sm:h-5 sm:w-5"
                  />
                  <Label htmlFor="isActive" className="text-xs sm:text-sm text-seguranca-lightgray cursor-pointer flex-1">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-seguranca-yellow flex-shrink-0" />
                      <span className="truncate">Usuário ativo</span>
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2 sm:space-x-3 p-2.5 sm:p-3 bg-seguranca-graphite rounded-lg border border-gray-600">
                  <Checkbox
                    id="sendEmail"
                    checked={form.sendEmailNotification}
                    onCheckedChange={(checked) => handleInputChange('sendEmailNotification', checked as boolean)}
                    disabled={loading}
                    className="border-gray-500 data-[state=checked]:bg-seguranca-yellow data-[state=checked]:border-seguranca-yellow h-4 w-4 sm:h-5 sm:w-5"
                  />
                  <Label htmlFor="sendEmail" className="text-xs sm:text-sm text-seguranca-lightgray cursor-pointer flex-1">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-seguranca-yellow flex-shrink-0" />
                      <span className="truncate">Enviar email com credenciais</span>
                    </div>
                  </Label>
                </div>
              </div>
            </div>

            {error && (
              <Card className="bg-red-500/10 border-red-500/30">
                <div className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-400 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-red-300 font-medium break-words">{error}</span>
                  </div>
                </div>
              </Card>
            )}

            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 sm:pt-6 border-t border-gray-600">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="w-full sm:w-auto border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white h-10 sm:h-11 text-sm sm:text-base order-2 sm:order-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || loadingRoles}
                className="w-full sm:w-auto bg-gradient-to-r from-seguranca-red to-seguranca-yellow hover:from-seguranca-red/90 hover:to-seguranca-yellow/90 text-white font-medium h-10 sm:h-11 text-sm sm:text-base order-1 sm:order-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                    <span className="truncate">{isUpdateMode ? 'Atualizando...' : 'Criando...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                    <span className="truncate">{isUpdateMode ? 'Atualizar Usuário' : 'Criar Usuário'}</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CriarUsuarioPadraoModal;
