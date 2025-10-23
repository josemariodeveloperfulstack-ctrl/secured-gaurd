import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Send, Users, Building2, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { messageService } from '@/services/messageService';
import { userService } from '@/services/userService';

interface MessageFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  message?: any | null;
  mode: 'create' | 'edit';
}

export const MessageFormModal: React.FC<MessageFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  message,
  mode
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'INDIVIDUAL' as 'INDIVIDUAL' | 'GROUP' | 'DEPARTMENT' | 'GLOBAL',
    priority: 'NORMAL' as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
    recipientIds: [] as string[],
    departmentIds: [] as string[],
    sendEmail: false,
    sendNotification: true,
    scheduledAt: ''
  });

  useEffect(() => {
    if (mode === 'edit' && message) {
      setFormData({
        title: message.title || '',
        content: message.content || '',
        type: message.type || 'INDIVIDUAL',
        priority: message.priority || 'NORMAL',
        recipientIds: message.recipients?.map((r: any) => r.id) || [],
        departmentIds: message.departments?.map((d: any) => d.id) || [],
        sendEmail: message.sendEmail || false,
        sendNotification: message.sendNotification !== false,
        scheduledAt: message.scheduledAt || ''
      });
    }
  }, [mode, message]);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const usersList = await userService.getAllUsers();
      setUsers(usersList);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de usuários",
        variant: "destructive"
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.title.trim()) {
      toast({
        title: "Erro",
        description: "Título é obrigatório",
        variant: "destructive"
      });
      return;
    }

    if (!formData.content.trim()) {
      toast({
        title: "Erro",
        description: "Conteúdo é obrigatório",
        variant: "destructive"
      });
      return;
    }

    if (formData.type === 'INDIVIDUAL' && formData.recipientIds.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um destinatário",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      if (mode === 'create') {
        await messageService.sendSystemMessage(formData);
        toast({
          title: "Sucesso",
          description: "Mensagem enviada com sucesso"
        });
      } else {
        // TODO: Implementar edição
        toast({
          title: "Info",
          description: "Edição será implementada em breve"
        });
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar mensagem",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        title: '',
        content: '',
        type: 'INDIVIDUAL',
        priority: 'NORMAL',
        recipientIds: [],
        departmentIds: [],
        sendEmail: false,
        sendNotification: true,
        scheduledAt: ''
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-seguranca-graphite border-gray-600 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-seguranca-yellow flex items-center gap-2">
            <Send className="h-6 w-6" />
            {mode === 'create' ? 'Nova Mensagem' : 'Editar Mensagem'}
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            {mode === 'create' 
              ? 'Preencha os dados para enviar uma nova mensagem'
              : 'Atualize as informações da mensagem'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6">
            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-seguranca-lightgray">
                Título *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Digite o título da mensagem"
                className="bg-seguranca-black border-gray-600 text-white placeholder:text-gray-500"
                required
              />
            </div>

            {/* Tipo e Prioridade */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type" className="text-seguranca-lightgray flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Tipo de Mensagem *
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="bg-seguranca-black border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-graphite border-gray-600">
                    <SelectItem value="INDIVIDUAL" className="text-white hover:bg-seguranca-black">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Individual
                      </div>
                    </SelectItem>
                    <SelectItem value="GROUP" className="text-white hover:bg-seguranca-black">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Grupo
                      </div>
                    </SelectItem>
                    <SelectItem value="DEPARTMENT" className="text-white hover:bg-seguranca-black">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Departamento
                      </div>
                    </SelectItem>
                    <SelectItem value="GLOBAL" className="text-white hover:bg-seguranca-black">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Global
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority" className="text-seguranca-lightgray">
                  Prioridade *
                </Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger className="bg-seguranca-black border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-graphite border-gray-600">
                    <SelectItem value="LOW" className="text-green-400 hover:bg-seguranca-black">
                      Baixa
                    </SelectItem>
                    <SelectItem value="NORMAL" className="text-blue-400 hover:bg-seguranca-black">
                      Normal
                    </SelectItem>
                    <SelectItem value="HIGH" className="text-orange-400 hover:bg-seguranca-black">
                      Alta
                    </SelectItem>
                    <SelectItem value="URGENT" className="text-red-400 hover:bg-seguranca-black">
                      Urgente
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Destinatários - apenas para tipo INDIVIDUAL */}
            {formData.type === 'INDIVIDUAL' && (
              <div className="space-y-2">
                <Label className="text-seguranca-lightgray">
                  Destinatários *
                </Label>
                {loadingUsers ? (
                  <div className="flex items-center justify-center p-4 bg-seguranca-black rounded-lg">
                    <Loader2 className="h-5 w-5 animate-spin text-seguranca-yellow mr-2" />
                    <span className="text-gray-400">Carregando usuários...</span>
                  </div>
                ) : (
                  <div className="max-h-40 overflow-y-auto bg-seguranca-black rounded-lg p-3 border border-gray-600 space-y-2">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`user-${user.id}`}
                          checked={formData.recipientIds.includes(user.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                recipientIds: [...formData.recipientIds, user.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                recipientIds: formData.recipientIds.filter(id => id !== user.id)
                              });
                            }
                          }}
                        />
                        <Label
                          htmlFor={`user-${user.id}`}
                          className="text-seguranca-lightgray cursor-pointer flex-1"
                        >
                          {user.name} ({user.email})
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Conteúdo */}
            <div className="space-y-2">
              <Label htmlFor="content" className="text-seguranca-lightgray">
                Mensagem *
              </Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Digite o conteúdo da mensagem"
                className="min-h-[150px] bg-seguranca-black border-gray-600 text-white placeholder:text-gray-500"
                required
              />
            </div>

            {/* Opções */}
            <div className="space-y-3 bg-seguranca-black p-4 rounded-lg border border-gray-600">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendEmail"
                  checked={formData.sendEmail}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, sendEmail: checked as boolean })
                  }
                />
                <Label htmlFor="sendEmail" className="text-seguranca-lightgray cursor-pointer">
                  Enviar por email
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendNotification"
                  checked={formData.sendNotification}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, sendNotification: checked as boolean })
                  }
                />
                <Label htmlFor="sendNotification" className="text-seguranca-lightgray cursor-pointer">
                  Enviar notificação push
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="border-gray-600 text-white hover:bg-seguranca-black"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-seguranca-red hover:bg-seguranca-darkred"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {mode === 'create' ? 'Enviar Mensagem' : 'Salvar Alterações'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MessageFormModal;