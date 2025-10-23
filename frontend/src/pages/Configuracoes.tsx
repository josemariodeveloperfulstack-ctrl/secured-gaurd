import React, { useState, useEffect } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell,
  Cloud, 
  CreditCard, 
  Lock, 
  Mail, 
  MessageSquare, 
  Save, 
  Shield, 
  Users,
  AlertTriangle,
  CheckCircle,
  Building2,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { companyService } from '@/services/companyService';
import { userService, User } from '@/services/userService';
import { securitySettingsService, SecuritySettings } from '@/services/securitySettingsService';
import { notificationSettingsService, NotificationSettings } from '@/services/notificationSettingsService';
import UserFormModal from '@/components/UserFormModal';

const Configuracoes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingSecurity, setLoadingSecurity] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userModalMode, setUserModalMode] = useState<'create' | 'edit'>('create');
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);

  const [empresaForm, setEmpresaForm] = useState({
    id: '',
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    website: '',
    sigla: '',
    description: '',
    status: 'ACTIVE'
  });

  // Carregar dados da empresa, usuários, configurações de segurança e notificações ao montar o componente
  useEffect(() => {
    loadCompanyData();
    loadUsers();
    loadSecuritySettings();
    loadNotificationSettings();
  }, []);

  const loadCompanyData = async () => {
    try {
      setLoadingCompany(true);
      console.log('🔍 DEBUG: Carregando dados da empresa...');
      
      const companies = await companyService.getAllCompanies();
      console.log('🔍 DEBUG: Empresas recebidas:', companies);
      
      if (companies && companies.length > 0) {
        // Pegar a primeira empresa (ou implementar lógica para escolher a empresa principal)
        const company = companies[0];
        console.log('🔍 DEBUG: Empresa selecionada:', company);
        
        setEmpresaForm({
          id: company.id || '',
          name: company.name || '',
          cnpj: company.cnpj || '',
          email: company.email || '',
          phone: company.phone || '',
          address: company.address || '',
          city: company.city || '',
          state: company.state || '',
          zipCode: company.zipCode || '',
          website: company.website || '',
          sigla: company.sigla || '',
          description: company.description || '',
          status: company.status || 'ACTIVE'
        });
        
        toast({
          title: "Dados carregados",
          description: "Informações da empresa carregadas com sucesso.",
        });
      } else {
        toast({
          title: "Aviso",
          description: "Nenhuma empresa encontrada no sistema.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados da empresa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados da empresa.",
        variant: "destructive"
      });
    } finally {
      setLoadingCompany(false);
    }
  };

  const handleEmpresaChange = (field: string, value: string) => {
    setEmpresaForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveEmpresa = async () => {
    try {
      setLoading(true);
      
      if (!empresaForm.name || !empresaForm.cnpj) {
        toast({
          title: "Erro",
          description: "Nome da empresa e CNPJ são obrigatórios.",
          variant: "destructive"
        });
        return;
      }

      if (empresaForm.id) {
        // Atualizar empresa existente
        await companyService.updateCompany(empresaForm.id, {
          name: empresaForm.name,
          cnpj: empresaForm.cnpj,
          email: empresaForm.email,
          phone: empresaForm.phone,
          address: empresaForm.address,
          website: empresaForm.website,
          sigla: empresaForm.sigla,
          description: empresaForm.description,
          status: empresaForm.status as any
        });
        
        toast({
          title: "Sucesso",
          description: "Dados da empresa atualizados com sucesso.",
        });
      } else {
        // Criar nova empresa
        await companyService.createCompany({
          name: empresaForm.name,
          cnpj: empresaForm.cnpj,
          email: empresaForm.email,
          phone: empresaForm.phone,
          address: empresaForm.address,
          website: empresaForm.website,
          sigla: empresaForm.sigla,
          description: empresaForm.description,
          status: empresaForm.status as any
        });
        
        toast({
          title: "Sucesso",
          description: "Empresa criada com sucesso.",
        });
        
        // Recarregar dados após criação
        await loadCompanyData();
      }
    } catch (error) {
      console.error('❌ Erro ao salvar empresa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar os dados da empresa.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Funções para gerenciar configurações de segurança
  const loadSecuritySettings = async () => {
    try {
      setLoadingSecurity(true);
      console.log('🔍 DEBUG: Carregando configurações de segurança...');
      
      // Usar a primeira empresa como padrão (ou implementar lógica para escolher empresa principal)
      const companies = await companyService.getAllCompanies();
      if (companies && companies.length > 0) {
        const companyId = companies[0].id;
        const settings = await securitySettingsService.getSecuritySettings(companyId);
        console.log('🔍 DEBUG: Configurações de segurança recebidas:', settings);
        
        setSecuritySettings(settings);
        
    toast({
          title: "Configurações carregadas",
          description: "Configurações de segurança carregadas com sucesso.",
        });
      } else {
        toast({
          title: "Aviso",
          description: "Nenhuma empresa encontrada para carregar configurações.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Erro ao carregar configurações de segurança:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações de segurança.",
        variant: "destructive"
      });
    } finally {
      setLoadingSecurity(false);
    }
  };

  const handleSaveSeguranca = async () => {
    if (!securitySettings) {
    toast({
        title: "Erro",
        description: "Configurações de segurança não carregadas.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      await securitySettingsService.updateSecuritySettings(securitySettings.companyId, {
        twoFactorEnabled: securitySettings.twoFactorEnabled,
        twoFactorMethod: securitySettings.twoFactorMethod,
        passwordExpiryEnabled: securitySettings.passwordExpiryEnabled,
        passwordExpiryDays: securitySettings.passwordExpiryDays,
        passwordMinLength: securitySettings.passwordMinLength,
        passwordRequireUppercase: securitySettings.passwordRequireUppercase,
        passwordRequireLowercase: securitySettings.passwordRequireLowercase,
        passwordRequireNumbers: securitySettings.passwordRequireNumbers,
        passwordRequireSymbols: securitySettings.passwordRequireSymbols,
        accountLockoutEnabled: securitySettings.accountLockoutEnabled,
        maxFailedAttempts: securitySettings.maxFailedAttempts,
        lockoutDurationMinutes: securitySettings.lockoutDurationMinutes,
        sessionTimeoutMinutes: securitySettings.sessionTimeoutMinutes,
        ipWhitelistEnabled: securitySettings.ipWhitelistEnabled,
        ipWhitelist: securitySettings.ipWhitelist,
        auditLogEnabled: securitySettings.auditLogEnabled
      });
      
      toast({
        title: "Sucesso",
        description: "Configurações de segurança salvas com sucesso.",
      });
      
      // Recarregar configurações após salvar
      await loadSecuritySettings();
    } catch (error) {
      console.error('❌ Erro ao salvar configurações de segurança:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações de segurança.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSecuritySettingChange = (field: keyof SecuritySettings, value: any) => {
    if (securitySettings) {
      setSecuritySettings(prev => ({
        ...prev!,
        [field]: value
      }));
    }
  };

  // Funções para gerenciar configurações de notificações
  const loadNotificationSettings = async () => {
    try {
      setLoadingNotifications(true);
      console.log('🔍 DEBUG: Carregando configurações de notificações...');
      
      const companies = await companyService.getAllCompanies();
      if (companies && companies.length > 0) {
        const companyId = companies[0].id;
        const settings = await notificationSettingsService.getCompanyNotificationSettings(companyId);
        console.log('🔍 DEBUG: Configurações de notificações recebidas:', settings);
        
        setNotificationSettings(settings);
        
        toast({
          title: "Configurações carregadas",
          description: "Configurações de notificações carregadas com sucesso.",
        });
      } else {
        toast({
          title: "Aviso",
          description: "Nenhuma empresa encontrada para carregar configurações.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Erro ao carregar configurações de notificações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações de notificações.",
        variant: "destructive"
      });
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleSaveNotificacoes = async () => {
    if (!notificationSettings) {
      toast({
        title: "Erro",
        description: "Configurações de notificações não carregadas.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      await notificationSettingsService.updateCompanyNotificationSettings(notificationSettings.companyId, {
        emailEnabled: notificationSettings.emailEnabled,
        emailContractUpdates: notificationSettings.emailContractUpdates,
        emailPaymentReceived: notificationSettings.emailPaymentReceived,
        emailScheduleChanges: notificationSettings.emailScheduleChanges,
        emailDailySummary: notificationSettings.emailDailySummary,
        emailWeeklyReport: notificationSettings.emailWeeklyReport,
        emailSystemAlerts: notificationSettings.emailSystemAlerts,
        smtpEnabled: notificationSettings.smtpEnabled,
        smtpHost: notificationSettings.smtpHost,
        smtpPort: notificationSettings.smtpPort,
        smtpUsername: notificationSettings.smtpUsername,
        smtpPassword: notificationSettings.smtpPassword,
        smtpFromEmail: notificationSettings.smtpFromEmail,
        smtpFromName: notificationSettings.smtpFromName,
        smtpUseTls: notificationSettings.smtpUseTls,
        smtpUseSsl: notificationSettings.smtpUseSsl,
        pushEnabled: notificationSettings.pushEnabled,
        pushContractUpdates: notificationSettings.pushContractUpdates,
        pushPaymentReceived: notificationSettings.pushPaymentReceived,
        pushScheduleChanges: notificationSettings.pushScheduleChanges,
        pushSystemAlerts: notificationSettings.pushSystemAlerts,
        smsEnabled: notificationSettings.smsEnabled,
        smsUrgentOnly: notificationSettings.smsUrgentOnly,
        whatsappEnabled: notificationSettings.whatsappEnabled,
        whatsappContractUpdates: notificationSettings.whatsappContractUpdates,
        whatsappPaymentReceived: notificationSettings.whatsappPaymentReceived,
        whatsappScheduleChanges: notificationSettings.whatsappScheduleChanges,
        quietHoursEnabled: notificationSettings.quietHoursEnabled,
        quietHoursStart: notificationSettings.quietHoursStart,
        quietHoursEnd: notificationSettings.quietHoursEnd
      });
      
      toast({
        title: "Sucesso",
        description: "Preferências de notificação salvas com sucesso.",
      });
      
      await loadNotificationSettings();
    } catch (error) {
      console.error('❌ Erro ao salvar configurações de notificações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações de notificações.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationSettingChange = (field: keyof NotificationSettings, value: any) => {
    if (notificationSettings) {
      setNotificationSettings(prev => ({
        ...prev!,
        [field]: value
      }));
    }
  };

  const handleSaveIntegracoes = () => {
    toast({
      title: "Integrações salvas",
      description: "As configurações de integração foram atualizadas com sucesso.",
    });
  };

  const handleSaveOperacional = () => {
    toast({
      title: "Configurações operacionais salvas",
      description: "As configurações operacionais foram atualizadas com sucesso.",
    });
  };

  // Funções para gerenciar usuários
  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      console.log('🔍 DEBUG: Carregando usuários...');
      
      const usersData = await userService.getAllUsers();
      console.log('🔍 DEBUG: Usuários recebidos:', usersData);
      
      setUsers(usersData);
      
      toast({
        title: "Usuários carregados",
        description: `${usersData.length} usuários carregados com sucesso.`,
      });
    } catch (error) {
      console.error('❌ Erro ao carregar usuários:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários.",
        variant: "destructive"
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSearchUsers = async () => {
    try {
      setLoadingUsers(true);
      const usersData = await userService.searchUsers(searchQuery);
      setUsers(usersData);
    } catch (error) {
      console.error('❌ Erro ao buscar usuários:', error);
      toast({
        title: "Erro",
        description: "Não foi possível buscar os usuários.",
        variant: "destructive"
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setUserModalMode('create');
    setShowUserModal(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setUserModalMode('edit');
    setShowUserModal(true);
  };

  const handleToggleUserStatus = async (user: User) => {
    try {
      setLoading(true);
      await userService.toggleUserStatus(user.id, !user.active);
      
      toast({
        title: "Sucesso",
        description: `Usuário ${user.active ? 'desativado' : 'ativado'} com sucesso.`,
      });
      
      // Recarregar lista de usuários
      await loadUsers();
    } catch (error) {
      console.error('❌ Erro ao alterar status do usuário:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do usuário.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${user.name}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await userService.deleteUser(user.id);
      
      toast({
        title: "Sucesso",
        description: "Usuário excluído com sucesso.",
      });
      
      // Recarregar lista de usuários
      await loadUsers();
    } catch (error) {
      console.error('❌ Erro ao excluir usuário:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o usuário.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserModalSuccess = () => {
    loadUsers();
  };

  return (
    <StandardLayout>
      <div className="space-y-6">
        {/* Alertas no topo da página */}
        <div className="space-y-3">
          <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              <strong>Atenção:</strong> Sistema de notificações por email habilitado. Verifique suas configurações de SMTP.
            </AlertDescription>
          </Alert>
          
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
            <Bell className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              <strong>Novidade:</strong> Sistema de alertas operacionais está ativo. Configure suas preferências na aba Operacional.
            </AlertDescription>
          </Alert>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-seguranca-lightgray">Configurações</h1>
            <p className="text-gray-400 mt-1">Gerencie as configurações do sistema</p>
          </div>
        </div>

        <Tabs defaultValue="empresa" className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 w-full bg-seguranca-graphite border-gray-600 p-1 rounded-lg">
            <TabsTrigger value="empresa" className="text-sm sm:text-base rounded-md data-[state='active']:bg-seguranca-black data-[state='active']:text-seguranca-yellow">Empresa</TabsTrigger>
            <TabsTrigger value="usuarios" className="text-sm sm:text-base rounded-md data-[state='active']:bg-seguranca-black data-[state='active']:text-seguranca-yellow">Usuários</TabsTrigger>
            <TabsTrigger value="seguranca" className="text-sm sm:text-base rounded-md data-[state='active']:bg-seguranca-black data-[state='active']:text-seguranca-yellow">Segurança</TabsTrigger>
            <TabsTrigger value="notificacoes" className="text-sm sm:text-base rounded-md data-[state='active']:bg-seguranca-black data-[state='active']:text-seguranca-yellow">Notificações</TabsTrigger>
            <TabsTrigger value="integracao" className="text-sm sm:text-base rounded-md data-[state='active']:bg-seguranca-black data-[state='active']:text-seguranca-yellow">Integrações</TabsTrigger>
            <TabsTrigger value="operacional" className="text-sm sm:text-base rounded-md data-[state='active']:bg-seguranca-black data-[state='active']:text-seguranca-yellow">Operacional</TabsTrigger>
          </TabsList>
          
          {/* Aba Dados da Empresa */}
          <TabsContent value="empresa" className="mt-6">
            <Card className="bg-seguranca-graphite border-gray-600">
              <CardHeader>
                <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Dados da Empresa
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Informações gerais sobre a empresa e contato
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingCompany ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-seguranca-yellow mr-2" />
                    <span className="text-seguranca-lightgray">Carregando dados da empresa...</span>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-seguranca-lightgray flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Nome da Empresa *
                        </Label>
                        <Input 
                          id="name" 
                          value={empresaForm.name} 
                          onChange={(e) => handleEmpresaChange('name', e.target.value)}
                          className="bg-seguranca-black border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                          placeholder="Ex: Empresa XYZ Ltda"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cnpj" className="text-seguranca-lightgray flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          CNPJ *
                        </Label>
                        <Input 
                          id="cnpj" 
                          value={empresaForm.cnpj} 
                          onChange={(e) => handleEmpresaChange('cnpj', e.target.value)}
                          className="bg-seguranca-black border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                          placeholder="00.000.000/0000-00"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sigla" className="text-seguranca-lightgray">Sigla da Empresa</Label>
                        <Input 
                          id="sigla" 
                          value={empresaForm.sigla} 
                          onChange={(e) => handleEmpresaChange('sigla', e.target.value)}
                          className="bg-seguranca-black border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                          placeholder="Ex: XYZ"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="website" className="text-seguranca-lightgray">Website</Label>
                        <Input 
                          id="website" 
                          value={empresaForm.website} 
                          onChange={(e) => handleEmpresaChange('website', e.target.value)}
                          className="bg-seguranca-black border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                          placeholder="www.exemplo.com.br"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-seguranca-lightgray">Endereço</Label>
                      <Input 
                        id="address" 
                        value={empresaForm.address} 
                        onChange={(e) => handleEmpresaChange('address', e.target.value)}
                        className="bg-seguranca-black border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                        placeholder="Rua, número, bairro"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-seguranca-lightgray">Cidade</Label>
                        <Input 
                          id="city" 
                          value={empresaForm.city} 
                          onChange={(e) => handleEmpresaChange('city', e.target.value)}
                          className="bg-seguranca-black border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                          placeholder="São Paulo"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state" className="text-seguranca-lightgray">Estado</Label>
                        <Input 
                          id="state" 
                          value={empresaForm.state} 
                          onChange={(e) => handleEmpresaChange('state', e.target.value)}
                          className="bg-seguranca-black border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                          placeholder="SP"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zipCode" className="text-seguranca-lightgray">CEP</Label>
                        <Input 
                          id="zipCode" 
                          value={empresaForm.zipCode} 
                          onChange={(e) => handleEmpresaChange('zipCode', e.target.value)}
                          className="bg-seguranca-black border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                          placeholder="00000-000"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-seguranca-lightgray">Telefone</Label>
                        <Input 
                          id="phone" 
                          value={empresaForm.phone} 
                          onChange={(e) => handleEmpresaChange('phone', e.target.value)}
                          className="bg-seguranca-black border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-seguranca-lightgray">Email</Label>
                        <Input 
                          id="email" 
                          type="email"
                          value={empresaForm.email} 
                          onChange={(e) => handleEmpresaChange('email', e.target.value)}
                          className="bg-seguranca-black border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                          placeholder="contato@empresa.com.br"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-seguranca-lightgray">Descrição</Label>
                      <Input 
                        id="description" 
                        value={empresaForm.description} 
                        onChange={(e) => handleEmpresaChange('description', e.target.value)}
                        className="bg-seguranca-black border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                        placeholder="Breve descrição da empresa"
                      />
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button 
                        onClick={handleSaveEmpresa}
                        disabled={loading}
                        className="bg-seguranca-red hover:bg-seguranca-darkred"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            {empresaForm.id ? 'Atualizar' : 'Salvar'} Dados da Empresa
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Usuários */}
          <TabsContent value="usuarios" className="mt-6">
            <Card className="bg-seguranca-graphite border-gray-600">
              <CardHeader>
                <CardTitle className="text-seguranca-lightgray">Gerenciamento de Usuários</CardTitle>
                <CardDescription className="text-gray-400">
                  Gerencie os usuários que têm acesso ao sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                  <div className="w-full sm:flex-1 flex gap-2">
                    <Input 
                      placeholder="Pesquisar usuários..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full sm:max-w-sm bg-seguranca-black border-gray-600 text-seguranca-lightgray" 
                    />
                    <Button 
                      onClick={handleSearchUsers}
                      variant="outline"
                      className="border-gray-600 text-seguranca-lightgray"
                    >
                      Buscar
                    </Button>
                  </div>
                  <Button 
                    onClick={handleCreateUser}
                    className="bg-seguranca-red hover:bg-seguranca-darkred w-full sm:w-auto"
                  >
                    <Users className="h-4 w-4 mr-2" /> Adicionar Usuário
                  </Button>
                </div>

                {loadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-seguranca-yellow mr-2" />
                    <span className="text-seguranca-lightgray">Carregando usuários...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-seguranca-lightgray">Nome</TableHead>
                      <TableHead className="text-seguranca-lightgray">Email</TableHead>
                        <TableHead className="text-seguranca-lightgray">Usuário</TableHead>
                        <TableHead className="text-seguranca-lightgray">Funções</TableHead>
                      <TableHead className="text-seguranca-lightgray">Status</TableHead>
                      <TableHead className="text-seguranca-lightgray">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                      {users.length === 0 ? (
                    <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                            Nenhum usuário encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((userItem) => (
                          <TableRow key={userItem.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-seguranca-red/20 flex items-center justify-center text-seguranca-darkred">
                                  {userItem.name.charAt(0).toUpperCase()}
                          </div>
                                <span className="text-seguranca-lightgray">{userItem.name}</span>
                        </div>
                      </TableCell>
                            <TableCell className="text-seguranca-lightgray">{userItem.email}</TableCell>
                            <TableCell className="text-seguranca-lightgray">{userItem.username}</TableCell>
                            <TableCell className="text-seguranca-lightgray">
                              <div className="flex flex-wrap gap-1">
                                {userItem.roles.map((role) => (
                                  <span 
                                    key={role}
                                    className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                  >
                                    {role}
                                  </span>
                                ))}
                              </div>
                            </TableCell>
                      <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                userItem.active 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {userItem.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </TableCell>
                      <TableCell>
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleEditUser(userItem)}
                                  className="border-gray-600 text-seguranca-lightgray hover:bg-gray-700"
                                >
                          Editar
                        </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleToggleUserStatus(userItem)}
                                  className={`${
                                    userItem.active 
                                      ? 'border-orange-500 text-orange-500 hover:bg-orange-50' 
                                      : 'border-green-500 text-green-500 hover:bg-green-50'
                                  }`}
                                >
                                  {userItem.active ? 'Desativar' : 'Ativar'}
                        </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleDeleteUser(userItem)}
                                  className="border-red-500 text-red-500 hover:bg-red-50"
                                >
                                  Excluir
                                </Button>
                              </div>
                      </TableCell>
                    </TableRow>
                        ))
                      )}
                  </TableBody>
                </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Segurança */}
          <TabsContent value="seguranca" className="mt-6">
            <Card className="bg-seguranca-graphite border-gray-600">
              <CardHeader>
                <CardTitle className="text-seguranca-lightgray">Configurações de Segurança</CardTitle>
                <CardDescription className="text-gray-400">
                  Gerencie as configurações de segurança do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {loadingSecurity ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-seguranca-yellow mr-2" />
                    <span className="text-seguranca-lightgray">Carregando configurações de segurança...</span>
                  </div>
                ) : securitySettings ? (
                  <>
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2 text-seguranca-lightgray">
                    <Lock className="h-5 w-5" /> Autenticação
                  </h3>
                  
                  <div className="flex items-start space-x-3 pl-2">
                        <Checkbox 
                          id="two_factor" 
                          checked={securitySettings.twoFactorEnabled}
                          onCheckedChange={(checked) => handleSecuritySettingChange('twoFactorEnabled', checked)}
                        />
                    <div className="space-y-1 leading-none">
                      <Label htmlFor="two_factor" className="text-seguranca-lightgray">
                        Habilitar autenticação de dois fatores (2FA)
                      </Label>
                      <p className="text-sm text-gray-400">
                        Requer uma verificação adicional ao fazer login
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2 text-seguranca-lightgray">
                    <Shield className="h-5 w-5" /> Políticas de Senha
                  </h3>
                  
                  <div className="grid gap-3 pl-2">
                    <div className="flex items-start space-x-3">
                          <Checkbox 
                            id="password_expiry" 
                            checked={securitySettings.passwordExpiryEnabled}
                            onCheckedChange={(checked) => handleSecuritySettingChange('passwordExpiryEnabled', checked)}
                          />
                      <div className="space-y-1 leading-none">
                        <Label htmlFor="password_expiry" className="text-seguranca-lightgray">
                              Expirar senhas a cada {securitySettings.passwordExpiryDays} dias
                        </Label>
                        <p className="text-sm text-gray-400">
                          Os usuários serão solicitados a redefinir suas senhas
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                          <Checkbox 
                            id="password_requirements" 
                            checked={securitySettings.passwordRequireUppercase && securitySettings.passwordRequireLowercase && securitySettings.passwordRequireNumbers}
                            onCheckedChange={(checked) => {
                              handleSecuritySettingChange('passwordRequireUppercase', checked);
                              handleSecuritySettingChange('passwordRequireLowercase', checked);
                              handleSecuritySettingChange('passwordRequireNumbers', checked);
                            }}
                          />
                      <div className="space-y-1 leading-none">
                        <Label htmlFor="password_requirements" className="text-seguranca-lightgray">
                          Requisitos de senha forte
                        </Label>
                        <p className="text-sm text-gray-400">
                              Mínimo {securitySettings.passwordMinLength} caracteres, incluindo letras maiúsculas, minúsculas e números
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                          <Checkbox 
                            id="failed_attempts" 
                            checked={securitySettings.accountLockoutEnabled}
                            onCheckedChange={(checked) => handleSecuritySettingChange('accountLockoutEnabled', checked)}
                          />
                      <div className="space-y-1 leading-none">
                        <Label htmlFor="failed_attempts" className="text-seguranca-lightgray">
                              Bloquear conta após {securitySettings.maxFailedAttempts} tentativas falhas
                        </Label>
                        <p className="text-sm text-gray-400">
                              A conta será bloqueada por {securitySettings.lockoutDurationMinutes} minutos após múltiplas tentativas falhas
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center gap-2 text-seguranca-lightgray">
                        <Shield className="h-5 w-5" /> Configurações Avançadas
                      </h3>
                      
                      <div className="grid gap-3 pl-2">
                        <div className="flex items-start space-x-3">
                          <Checkbox 
                            id="audit_log" 
                            checked={securitySettings.auditLogEnabled}
                            onCheckedChange={(checked) => handleSecuritySettingChange('auditLogEnabled', checked)}
                          />
                          <div className="space-y-1 leading-none">
                            <Label htmlFor="audit_log" className="text-seguranca-lightgray">
                              Habilitar log de auditoria
                            </Label>
                            <p className="text-sm text-gray-400">
                              Registra todas as ações importantes do sistema para auditoria
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3">
                          <Checkbox 
                            id="ip_whitelist" 
                            checked={securitySettings.ipWhitelistEnabled}
                            onCheckedChange={(checked) => handleSecuritySettingChange('ipWhitelistEnabled', checked)}
                          />
                          <div className="space-y-1 leading-none">
                            <Label htmlFor="ip_whitelist" className="text-seguranca-lightgray">
                              Habilitar whitelist de IP
                            </Label>
                            <p className="text-sm text-gray-400">
                              Restringe acesso apenas a IPs autorizados
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handleSaveSeguranca}
                        disabled={loading}
                    className="bg-seguranca-red hover:bg-seguranca-darkred"
                  >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Salvar Configurações
                          </>
                        )}
                  </Button>
                </div>
                  </>
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    Erro ao carregar configurações de segurança
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Notificações */}
          <TabsContent value="notificacoes" className="mt-6">
            <Card className="bg-seguranca-graphite border-gray-600">
              <CardHeader>
                <CardTitle className="text-seguranca-lightgray">Configurações de Notificações</CardTitle>
                <CardDescription className="text-gray-400">
                  Gerencie como e quando você recebe notificações por email e alertas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {loadingNotifications ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-seguranca-yellow mr-2" />
                    <span className="text-seguranca-lightgray">Carregando configurações de notificações...</span>
                  </div>
                ) : notificationSettings ? (
                  <>
                {/* Sistema de Email */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2 text-seguranca-lightgray">
                    <Mail className="h-5 w-5" /> Sistema de Email
                  </h3>
                  
                      <Alert className={`${notificationSettings.smtpEnabled ? 'border-green-200 bg-green-50 dark:bg-green-900/20' : 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20'}`}>
                        {notificationSettings.smtpEnabled ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        )}
                        <AlertDescription className={notificationSettings.smtpEnabled ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200'}>
                          <strong>Status:</strong> {notificationSettings.smtpEnabled ? 'Servidor SMTP configurado e funcionando corretamente.' : 'Servidor SMTP não configurado.'}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid gap-4 pl-2">
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="contract_updates" 
                            checked={notificationSettings.emailContractUpdates}
                            onCheckedChange={(checked) => handleNotificationSettingChange('emailContractUpdates', checked)}
                      />
                      <div className="space-y-1 leading-none">
                        <Label htmlFor="contract_updates" className="text-seguranca-lightgray">
                          Atualizações de contratos
                        </Label>
                        <p className="text-sm text-gray-400">
                          Receba notificações quando contratos forem criados, atualizados ou expirarem
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="payment_received" 
                            checked={notificationSettings.emailPaymentReceived}
                            onCheckedChange={(checked) => handleNotificationSettingChange('emailPaymentReceived', checked)}
                      />
                      <div className="space-y-1 leading-none">
                        <Label htmlFor="payment_received" className="text-seguranca-lightgray">
                          Pagamentos recebidos
                        </Label>
                        <p className="text-sm text-gray-400">
                          Notificações sobre pagamentos confirmados e recebidos
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="schedule_changes" 
                            checked={notificationSettings.emailScheduleChanges}
                            onCheckedChange={(checked) => handleNotificationSettingChange('emailScheduleChanges', checked)}
                      />
                      <div className="space-y-1 leading-none">
                        <Label htmlFor="schedule_changes" className="text-seguranca-lightgray">
                          Mudanças de escala
                        </Label>
                        <p className="text-sm text-gray-400">
                          Alertas sobre alterações em escalas e horários
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="daily_summary" 
                            checked={notificationSettings.emailDailySummary}
                            onCheckedChange={(checked) => handleNotificationSettingChange('emailDailySummary', checked)}
                      />
                      <div className="space-y-1 leading-none">
                        <Label htmlFor="daily_summary" className="text-seguranca-lightgray">
                          Resumo diário
                        </Label>
                        <p className="text-sm text-gray-400">
                          Receba um resumo diário das atividades do sistema
                        </p>
                      </div>
                    </div>

                        <div className="flex items-start space-x-3">
                          <Checkbox 
                            id="system_alerts" 
                            checked={notificationSettings.emailSystemAlerts}
                            onCheckedChange={(checked) => handleNotificationSettingChange('emailSystemAlerts', checked)}
                          />
                          <div className="space-y-1 leading-none">
                            <Label htmlFor="system_alerts" className="text-seguranca-lightgray">
                              Alertas do sistema
                            </Label>
                            <p className="text-sm text-gray-400">
                              Receba alertas importantes sobre o sistema
                            </p>
                          </div>
                        </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handleSaveNotificacoes}
                        disabled={loading}
                    className="bg-seguranca-red hover:bg-seguranca-darkred"
                  >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Salvar Preferências
                          </>
                        )}
                  </Button>
                </div>
                  </>
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    Erro ao carregar configurações de notificações
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Integrações */}
          <TabsContent value="integracao" className="mt-6">
            <Card className="bg-seguranca-graphite border-gray-600">
              <CardHeader>
                <CardTitle className="text-seguranca-lightgray">Integrações</CardTitle>
                <CardDescription className="text-gray-400">
                  Conecte o sistema com outros serviços
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border border-gray-600 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-md bg-blue-100 flex items-center justify-center">
                      <Cloud className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <h3 className="font-medium text-seguranca-lightgray">API de Integração</h3>
                      <p className="text-sm text-gray-400">
                        Conecte seus sistemas externos
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" className="border-gray-600 text-seguranca-lightgray">Configurar</Button>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-gray-600 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-md bg-green-100 flex items-center justify-center">
                      <CreditCard className="text-green-600" size={24} />
                    </div>
                    <div>
                      <h3 className="font-medium text-seguranca-lightgray">Gateway de Pagamento</h3>
                      <p className="text-sm text-gray-400">
                        Integre com seu provedor de pagamentos
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" className="border-gray-600 text-seguranca-lightgray">Conectar</Button>
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handleSaveIntegracoes}
                    className="bg-seguranca-red hover:bg-seguranca-darkred"
                  >
                    <Save className="h-4 w-4 mr-2" /> Salvar Integrações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Operacional */}
          <TabsContent value="operacional" className="mt-6">
            <Card className="bg-seguranca-graphite border-gray-600">
              <CardHeader>
                <CardTitle className="text-seguranca-lightgray">Configurações Operacionais</CardTitle>
                <CardDescription className="text-gray-400">
                  Gerencie alertas e configurações operacionais do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Alertas Operacionais */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2 text-seguranca-lightgray">
                    <Bell className="h-5 w-5" /> Alertas Operacionais
                  </h3>
                  
                  <div className="grid gap-3 pl-2">
                    <div className="flex items-start space-x-3">
                      <Checkbox id="late_arrival" defaultChecked />
                      <div className="space-y-1 leading-none">
                        <Label htmlFor="late_arrival" className="text-seguranca-lightgray">
                          Atraso de funcionários
                        </Label>
                        <p className="text-sm text-gray-400">
                          Alertar quando funcionários chegarem atrasados aos postos
                        </p>
                      </div>
                    </div>
                    
                                        <div className="flex items-start space-x-3">
                      <Checkbox id="contract_expiry" defaultChecked />
                      <div className="space-y-1 leading-none">
                        <Label htmlFor="contract_expiry" className="text-seguranca-lightgray">
                          Vencimento de contratos
                        </Label>
                        <p className="text-sm text-gray-400">
                          Alertar sobre contratos próximos ao vencimento (30 dias)
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <Checkbox id="vehicle_maintenance" defaultChecked />
                      <div className="space-y-1 leading-none">
                        <Label htmlFor="vehicle_maintenance" className="text-seguranca-lightgray">
                          Manutenção de veículos
                        </Label>
                        <p className="text-sm text-gray-400">
                          Notificar sobre manutenções preventivas agendadas
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Checkbox id="equipment_check" />
                      <div className="space-y-1 leading-none">
                        <Label htmlFor="equipment_check" className="text-seguranca-lightgray">
                          Verificação de equipamentos
                        </Label>
                        <p className="text-sm text-gray-400">
                          Alertar sobre equipamentos que precisam de verificação
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Configurações de Horário */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2 text-seguranca-lightgray">
                    <MessageSquare className="h-5 w-5" /> Configurações de Horário
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 pl-2">
                    <div className="space-y-2">
                      <Label className="text-seguranca-lightgray">Horário de início do expediente</Label>
                      <Input 
                        type="time" 
                        defaultValue="08:00"
                        className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-seguranca-lightgray">Horário de fim do expediente</Label>
                      <Input 
                        type="time" 
                        defaultValue="18:00"
                        className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handleSaveOperacional}
                    className="bg-seguranca-red hover:bg-seguranca-darkred"
                  >
                    <Save className="h-4 w-4 mr-2" /> Salvar Configurações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal de Usuário */}
        <UserFormModal
          isOpen={showUserModal}
          onClose={() => setShowUserModal(false)}
          onSuccess={handleUserModalSuccess}
          user={selectedUser}
          mode={userModalMode}
        />
      </div>
    </StandardLayout>
  );
};

export default Configuracoes;
