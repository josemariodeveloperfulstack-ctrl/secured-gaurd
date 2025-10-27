import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, XCircle, UserPlus, Phone, Loader2 } from 'lucide-react';
import { contactValidationService, ContactValidationDetail, ContactValidationResponse } from '@/services/contactValidationService';
import { useToast } from '@/hooks/use-toast';
import { QuickUserFormModal } from './QuickUserFormModal';
import { WhatsAppUpdateModal } from './WhatsAppUpdateModal';

interface ContactValidationModalProps {
  open: boolean;
  onClose: () => void;
  employeeIds: string[];
  sendType: 'email' | 'whatsapp' | 'both';
  documentType?: 'holerite' | 'comprovante' | 'unificado';
  month?: number;
  year?: number;
  onValidated: (validatedIds: string[]) => void;
}

export const ContactValidationModal: React.FC<ContactValidationModalProps> = ({
  open,
  onClose,
  employeeIds,
  sendType,
  documentType,
  month,
  year,
  onValidated,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [validationData, setValidationData] = useState<ContactValidationResponse | null>(null);
  const [selectedForAction, setSelectedForAction] = useState<ContactValidationDetail | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  useEffect(() => {
    if (open && employeeIds.length > 0) {
      validateContacts();
    }
  }, [open, employeeIds]);

  const validateContacts = async () => {
    setLoading(true);
    try {
      const response = await contactValidationService.validateContacts({
        employeeIds,
        type: sendType,
        documentType,
        month,
        year,
      });
      setValidationData(response);
    } catch (error: any) {
      console.error('Erro ao validar contatos:', error);
      toast({
        title: '❌ Erro',
        description: 'Não foi possível validar os contatos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = (detail: ContactValidationDetail) => {
    setSelectedForAction(detail);
    setShowUserModal(true);
  };

  const handleAddWhatsApp = (detail: ContactValidationDetail) => {
    setSelectedForAction(detail);
    setShowWhatsAppModal(true);
  };

  const handleUserCreated = () => {
    setShowUserModal(false);
    setSelectedForAction(null);
    // Re-validar após criar usuário
    validateContacts();
    toast({
      title: '✅ Sucesso',
      description: 'Usuário criado com sucesso',
    });
  };

  const handleWhatsAppUpdated = () => {
    setShowWhatsAppModal(false);
    setSelectedForAction(null);
    // Re-validar após atualizar WhatsApp
    validateContacts();
    toast({
      title: '✅ Sucesso',
      description: 'WhatsApp atualizado com sucesso',
    });
  };

  const handleSendNow = () => {
    if (!validationData) return;
    
    // Retornar apenas IDs dos funcionários prontos para envio
    const readyIds = validationData.details
      .filter(d => d.status === 'ready')
      .map(d => d.employeeId);
    
    onValidated(readyIds);
    onClose();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'needs_action':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-green-600">Pronto</Badge>;
      case 'needs_action':
        return <Badge className="bg-yellow-600">Ação Necessária</Badge>;
      case 'error':
        return <Badge className="bg-red-600">Erro</Badge>;
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-seguranca-black border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-2xl text-seguranca-lightgray flex items-center gap-2">
              📤 Validar Contatos para Envio
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Tipo de envio: <Badge className="ml-2">{sendType === 'both' ? 'Email + WhatsApp' : sendType === 'email' ? '📧 Email' : '📱 WhatsApp'}</Badge>
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-seguranca-yellow" />
              <span className="ml-3 text-gray-400">Validando contatos...</span>
            </div>
          ) : validationData ? (
            <div className="space-y-4">
              {/* Estatísticas */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-seguranca-graphite p-4 rounded-lg border border-gray-700">
                  <div className="text-2xl font-bold text-green-500">{validationData.readyToSend}</div>
                  <div className="text-sm text-gray-400">Prontos</div>
                </div>
                <div className="bg-seguranca-graphite p-4 rounded-lg border border-gray-700">
                  <div className="text-2xl font-bold text-yellow-500">{validationData.needingAction}</div>
                  <div className="text-sm text-gray-400">Ação Necessária</div>
                </div>
                <div className="bg-seguranca-graphite p-4 rounded-lg border border-gray-700">
                  <div className="text-2xl font-bold text-red-500">{validationData.withErrors}</div>
                  <div className="text-sm text-gray-400">Com Erros</div>
                </div>
              </div>

              {/* Mensagem geral */}
              {!validationData.allReady && (
                <Alert className="bg-yellow-900/20 border-yellow-600">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <AlertDescription className="text-yellow-200">
                    {validationData.message}
                  </AlertDescription>
                </Alert>
              )}

              {/* Lista de funcionários */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {validationData.details.map((detail) => (
                  <div
                    key={detail.employeeId}
                    className="bg-seguranca-graphite p-4 rounded-lg border border-gray-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getStatusIcon(detail.status)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-seguranca-lightgray">
                              {detail.employeeName}
                            </h3>
                            {getStatusBadge(detail.status)}
                          </div>
                          <p className="text-sm text-gray-400">CPF: {detail.employeeCpf}</p>
                          
                          {/* Informações de contato */}
                          <div className="mt-2 space-y-1">
                            {(sendType === 'email' || sendType === 'both') && (
                              <div className="text-sm">
                                <span className="text-gray-500">Email:</span>{' '}
                                <span className={detail.canSendEmail ? 'text-green-400' : 'text-red-400'}>
                                  {detail.userEmail || detail.employeeEmail || 'Não cadastrado'}
                                </span>
                              </div>
                            )}
                            
                            {(sendType === 'whatsapp' || sendType === 'both') && (
                              <div className="text-sm">
                                <span className="text-gray-500">WhatsApp:</span>{' '}
                                <span className={detail.canSendWhatsApp ? 'text-green-400' : 'text-red-400'}>
                                  {detail.userWhatsapp || 'Não cadastrado'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Mensagem de status */}
                          <p className="text-sm text-gray-400 mt-2">{detail.statusMessage}</p>

                          {/* Erros */}
                          {detail.emailError && (
                            <p className="text-sm text-red-400 mt-1">⚠️ {detail.emailError}</p>
                          )}
                          {detail.whatsappError && (
                            <p className="text-sm text-red-400 mt-1">⚠️ {detail.whatsappError}</p>
                          )}
                        </div>
                      </div>

                      {/* Botões de ação */}
                      {detail.status === 'needs_action' && (
                        <div className="flex flex-col gap-2 ml-4">
                          {detail.needsUserCreation && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCreateUser(detail)}
                              className="border-green-600 text-green-400 hover:bg-green-600/10"
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Criar Usuário
                            </Button>
                          )}
                          {detail.needsWhatsAppUpdate && detail.hasUser && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddWhatsApp(detail)}
                              className="border-blue-600 text-blue-400 hover:bg-blue-600/10"
                            >
                              <Phone className="h-4 w-4 mr-1" />
                              Adicionar WhatsApp
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSendNow}
              disabled={!validationData || validationData.readyToSend === 0}
              className="bg-seguranca-yellow text-black hover:bg-seguranca-yellow/80"
            >
              Enviar Agora ({validationData?.readyToSend || 0})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modais de ação */}
      {selectedForAction && (
        <>
          <QuickUserFormModal
            open={showUserModal}
            onClose={() => setShowUserModal(false)}
            employeeDetail={selectedForAction}
            onSuccess={handleUserCreated}
          />
          <WhatsAppUpdateModal
            open={showWhatsAppModal}
            onClose={() => setShowWhatsAppModal(false)}
            employeeDetail={selectedForAction}
            onSuccess={handleWhatsAppUpdated}
          />
        </>
      )}
    </>
  );
};

