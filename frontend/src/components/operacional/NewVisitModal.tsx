import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import api from '@/lib/axios';
import { useToast } from '@/hooks/use-toast';
import { clientService } from '@/services/clientService';
import { Client } from '@/types/client';
import { EmployeeCombobox } from '@/components/ui/employee-combobox';
import { WorkPostCombobox } from '@/components/ui/work-post-combobox';
import type { SimpleEmployee } from '@/services/employeeService';
import { workPostService } from '@/services/workPostService';

interface NewVisitModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onVisitCreated?: () => void;
}

const NewVisitModal: React.FC<NewVisitModalProps> = ({ 
  open: externalOpen, 
  onOpenChange: externalOnOpenChange,
  onVisitCreated 
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Usar controle externo se fornecido, senão usar interno
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (externalOnOpenChange) {
      externalOnOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  };
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const { toast } = useToast();
  
  // Estados para dados leves (clientes carregados eagerly; funcionários e postos sob demanda)
  const [clients, setClients] = useState<Client[]>([]);

  // Nomes dos funcionários selecionados (para usar no payload e exibição)
  const [assignedEmployeeName, setAssignedEmployeeName] = useState<string>('');
  const [supervisorEmployeeName, setSupervisorEmployeeName] = useState<string>('');
  const [workPostName, setWorkPostName] = useState<string>('');

  const [formData, setFormData] = useState({
    title: '',
    workPostId: '',
    clientId: '',
    assignedToId: '',
    supervisorId: '',
    scheduledAt: '',
    description: '',
    priority: 'MEDIUM'
  });

  // Carregar dados do banco quando o modal abrir
  useEffect(() => {
    if (open) {
      loadFormData();
    }
  }, [open]);

  // Resolver o nome do posto sempre que o ID mudar (para usar como "location" no payload)
  useEffect(() => {
    let cancelled = false;
    if (!formData.workPostId) {
      setWorkPostName('');
      return;
    }
    workPostService.getWorkPostById(formData.workPostId)
      .then(wp => { if (!cancelled && wp) setWorkPostName(wp.name); })
      .catch(() => { if (!cancelled) setWorkPostName(''); });
    return () => { cancelled = true; };
  }, [formData.workPostId]);

  const loadFormData = async () => {
    setLoadingData(true);
    try {
      // Apenas clientes são carregados eagerly. Funcionários e postos usam busca on-demand.
      const clientsData = await clientService.getAllClients();
      setClients(clientsData || []);

      console.log('✅ Clientes carregados:', clientsData?.length);
    } catch (error) {
      console.error('❌ Erro ao carregar dados do formulário:', error);
      toast({
        title: 'Aviso',
        description: 'Alguns dados podem não estar disponíveis',
        variant: 'default'
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Mapear dados do formulário para o formato esperado pela API
      const scheduledDateTime = new Date(formData.scheduledAt);
      const visitDate = scheduledDateTime.toISOString().split('T')[0]; // yyyy-MM-dd
      const scheduledTime = scheduledDateTime.toTimeString().split(' ')[0].substring(0, 5); // HH:mm

      const visitData = {
        title: formData.title || undefined,
        workPostId: formData.workPostId || undefined,
        supervisorId: formData.supervisorId || undefined,
        assignedTo: assignedEmployeeName || '',
        location: workPostName || '',
        visitDate: visitDate,
        scheduledAt: scheduledTime,
        observations: formData.description || undefined,
        status: 'SCHEDULED' // Status padrão
      };
      
      console.log('🔗 Criando nova visita:', visitData);
      
      const response = await api.post('/api/visit-controls', visitData);
      
      console.log('✅ Visita criada com sucesso:', response.data);
      
      toast({
        title: "Sucesso",
        description: "Visita criada com sucesso!",
        variant: "default"
      });
      
      // Fechar modal e resetar formulário
      setOpen(false);
      setFormData({
        title: '',
        workPostId: '',
        clientId: '',
        assignedToId: '',
        supervisorId: '',
        scheduledAt: '',
        description: '',
        priority: 'MEDIUM'
      });
      setAssignedEmployeeName('');
      setSupervisorEmployeeName('');
      setWorkPostName('');
      
      // Notificar componente pai
      onVisitCreated?.();
      
    } catch (error) {
      console.error('❌ Erro ao criar visita:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a visita. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* DialogTrigger só aparece quando não há controle externo */}
      {externalOpen === undefined && (
        <DialogTrigger asChild>
          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Nova Visita
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px] bg-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Nova Visita</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {loadingData ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mr-2" />
              <span className="text-gray-300">Carregando dados...</span>
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="title" className="text-gray-300">Título da Visita *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                  placeholder="Ex: Inspeção de Segurança"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="workPostId" className="text-gray-300 text-sm sm:text-base">Setor / Posto de Trabalho *</Label>
                  <div className="mt-1">
                    <WorkPostCombobox
                      value={formData.workPostId}
                      onChange={(value) => {
                        setFormData({ ...formData, workPostId: value });
                        if (!value) setWorkPostName('');
                      }}
                      placeholder="Digite para buscar pelo nome ou código..."
                      searchPlaceholder="Digite para buscar..."
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="clientId" className="text-gray-300">Cliente *</Label>
                  <Select 
                    value={formData.clientId} 
                    onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600 max-h-[300px]">
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id} className="text-white hover:bg-gray-600">
                          {client.name}
                        </SelectItem>
                      ))}
                      {clients.length === 0 && (
                        <SelectItem value="none" disabled className="text-gray-400">
                          Nenhum cliente cadastrado
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="assignedToId" className="text-gray-300 text-sm sm:text-base">Funcionário Responsável *</Label>
                  <div className="mt-1">
                    <EmployeeCombobox
                      value={formData.assignedToId}
                      onChange={(value) => {
                        setFormData({ ...formData, assignedToId: value });
                        if (!value) setAssignedEmployeeName('');
                      }}
                      onEmployeeSelect={(emp: SimpleEmployee) => setAssignedEmployeeName(emp.name)}
                      placeholder="Selecione o funcionário"
                      searchPlaceholder="Digite pelo menos 3 caracteres..."
                      initialDisplayName={assignedEmployeeName}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="supervisorId" className="text-gray-300">Supervisor *</Label>
                  <div className="mt-1">
                    <EmployeeCombobox
                      value={formData.supervisorId}
                      onChange={(value) => {
                        setFormData({ ...formData, supervisorId: value });
                        if (!value) setSupervisorEmployeeName('');
                      }}
                      onEmployeeSelect={(emp: SimpleEmployee) => setSupervisorEmployeeName(emp.name)}
                      placeholder="Selecione o supervisor"
                      searchPlaceholder="Digite pelo menos 3 caracteres..."
                      emptyPlaceholder="Nenhum supervisor encontrado."
                      positionFilter="supervisor"
                      initialDisplayName={supervisorEmployeeName}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="priority" className="text-gray-300 text-sm sm:text-base">Prioridade</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="LOW" className="text-white">Baixa</SelectItem>
                      <SelectItem value="MEDIUM" className="text-white">Média</SelectItem>
                      <SelectItem value="HIGH" className="text-white">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="scheduledAt" className="text-gray-300">Data e Hora *</Label>
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description" className="text-gray-300 text-sm sm:text-base">Descrição / Observações</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                  placeholder="Detalhes da visita..."
                  rows={3}
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2 pt-3 sm:pt-4 border-t border-gray-600">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 w-full sm:w-auto order-2 sm:order-1"
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading || loadingData}
                  className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto order-1 sm:order-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Visita
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewVisitModal;
