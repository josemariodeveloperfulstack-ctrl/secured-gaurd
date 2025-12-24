import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { 
  MessageCircle, 
  Send, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Reply, 
  X, 
  AlertCircle, 
  Wifi, 
  WifiOff,
  Loader2,
  Info,
  Archive,
  Copy,
  Forward,
  Pin,
  Star,
  CheckSquare,
  Flag,
  Heart,
  ThumbsUp,
  Smile,
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MainLayout } from '@/components/MainLayout';
import { useMessageStore, User, ChatMessage, Conversation } from '@/stores/messageStore';
import { messageService, MessageServiceError } from '@/services/messageService';
import { useWebSocket } from '@/hooks/useWebSocket';
import { groupService } from '@/services/groupService';
import api from '@/lib/axios';

const ChatInterno: React.FC = () => {
  // Estado local para UI
  const [newMessage, setNewMessage] = useState('');
  const [chatType, setChatType] = useState<'individual' | 'group' | 'department'>('individual');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<any | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingModalUsers, setLoadingModalUsers] = useState(false);
  const [showOnlyOnline, setShowOnlyOnline] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [pinnedMessages, setPinnedMessages] = useState<Set<string>>(new Set());
  const [favoriteMessages, setFavoriteMessages] = useState<Set<string>>(new Set());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageCountRef = useRef<number>(0);
  const userStatusUpdatedRef = useRef<{ userId: string | null; isOnline: boolean | null }>({ userId: null, isOnline: null });
  const { toast } = useToast();
  
  // Estado global do store
  const {
    conversations,
    selectedConversation,
    chatMessages,
    availableUsers,
    loading,
    error,
    searchTerm,
    typingUsers,
    isConnected,
    setConversations,
    setSelectedConversation,
    setChatMessages,
    addChatMessage,
    updateChatMessage,
    removeChatMessage,
    setAvailableUsers,
    updateUserStatus,
    setLoading,
    setError,
    setSearchTerm,
    getFilteredConversations,
    getCurrentUser
  } = useMessageStore();

  const currentUser = getCurrentUser();
  const filteredConversationsRaw = getFilteredConversations();
  
  // Garantir que availableUsers, filteredConversations e chatMessages sejam sempre arrays
  const safeAvailableUsers = Array.isArray(availableUsers) ? availableUsers : [];
  const filteredConversations = Array.isArray(filteredConversationsRaw) ? filteredConversationsRaw : [];
  
  // Filtrar mensagens apenas da conversa selecionada
  const safeChatMessages = useMemo(() => {
    if (!selectedConversation || !Array.isArray(chatMessages)) return [];
    
    return chatMessages.filter((message) => {
      // Para conversas individuais, verificar se o remetente ou destinatário corresponde
      if (selectedConversation.type === 'individual') {
        return (
          message.recipient?.id === selectedConversation.id ||
          message.sender?.id === selectedConversation.id ||
          (message.recipient?.id === currentUser?.id && message.sender?.id === selectedConversation.id) ||
          (message.sender?.id === currentUser?.id && message.recipient?.id === selectedConversation.id)
        );
      }
      
      // Para grupos, verificar se o group.id corresponde
      if (selectedConversation.type === 'group') {
        return message.group?.id === selectedConversation.id;
      }
      
      // Para departamentos, verificar se o department.id corresponde
      if (selectedConversation.type === 'department') {
        return message.department?.id === selectedConversation.id;
      }
      
      return false;
    });
  }, [chatMessages, selectedConversation, currentUser?.id]);

  // WebSocket connection
  const { isConnected: wsConnected, sendTypingEvent } = useWebSocket({
    token: localStorage.getItem('token') || '',
    username: currentUser?.username || '',
    onMessage: (message) => {
      console.log('📨 [CHAT] Nova mensagem via WebSocket:', message);
      addChatMessage(message);
    },
    onTyping: (typing) => {
      console.log('⌨️ [CHAT] Evento de digitação:', typing);
      // Handled by store
    },
    onError: (error) => {
      console.error('❌ [CHAT] Erro WebSocket:', error);
      setError('Erro de conexão em tempo real');
    },
    onConnect: () => {
      console.log('✅ [CHAT] WebSocket conectado');
      setError(null);
      // Atualizar status online do usuário atual
      updateUserOnlineStatus(currentUser?.id || '', true);
    },
    onDisconnect: () => {
      console.log('🔌 [CHAT] WebSocket desconectado');
      // Atualizar status offline do usuário atual
      updateUserOnlineStatus(currentUser?.id || '', false);
    }
  });

  // Função para atualizar status online dos usuários
  const updateUserOnlineStatus = (userId: string, isOnline: boolean) => {
    // Verificar se já atualizamos este status para evitar loops infinitos
    if (userStatusUpdatedRef.current.userId === userId && 
        userStatusUpdatedRef.current.isOnline === isOnline) {
      return; // Já atualizado, não fazer nada
    }
    
    // Atualizar ref antes de chamar updateUserStatus
    userStatusUpdatedRef.current = { userId, isOnline };
    
    // Usar a função do store que já atualiza users e conversations
    updateUserStatus(userId, isOnline);
  };

  // Scroll automático para última mensagem (apenas quando novas mensagens são adicionadas)
  useEffect(() => {
    const currentMessageCount = safeChatMessages.length;
    
    // Só fazer scroll se houver novas mensagens
    if (currentMessageCount > lastMessageCountRef.current) {
      // Limpar timeout anterior se existir
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Usar timeout para evitar múltiplos scrolls durante renderizações rápidas
      scrollTimeoutRef.current = setTimeout(() => {
        scrollToBottom();
        lastMessageCountRef.current = currentMessageCount;
      }, 100);
    }
    
    // Cleanup
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [safeChatMessages.length]); // Usar apenas o comprimento, não o array inteiro

  // Carregar dados iniciais
  useEffect(() => {
    loadInitialData();
    loadGroupsAndDepartments();
  }, []);

  // Recarregar dados quando o modal abrir
  useEffect(() => {
    if (showNewChatModal) {
      // Recarregar usuários, grupos e departamentos quando o modal abrir
      const reloadData = async () => {
        setLoadingModalUsers(true);
        try {
          // Sempre recarregar usuários quando o modal abrir para ter dados atualizados
          const users = await messageService.getAvailableUsers();
          const usersArray = Array.isArray(users) ? users : [];
          setAvailableUsers(usersArray);
          console.log('✅ [MODAL] Usuários carregados:', usersArray.length);
          
          // Recarregar grupos e departamentos se estiverem vazios
          if (groups.length === 0 || departments.length === 0) {
            await loadGroupsAndDepartments();
          }
        } catch (err) {
          console.error('❌ [MODAL] Erro ao recarregar dados:', err);
        } finally {
          setLoadingModalUsers(false);
        }
      };
      
      reloadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNewChatModal]);

  // Carregar grupos e departamentos
  const loadGroupsAndDepartments = async () => {
    setLoadingGroups(true);
    setLoadingDepartments(true);
    try {
      const [groupsData, departmentsData] = await Promise.all([
        groupService.getGroups(),
        api.get('/api/departments/active').then(res => res.data).catch(() => [])
      ]);
      setGroups(groupsData || []);
      setDepartments(departmentsData || []);
    } catch (error) {
      console.error('Erro ao carregar grupos e departamentos:', error);
    } finally {
      setLoadingGroups(false);
      setLoadingDepartments(false);
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Carregar conversas recentes e usuários disponíveis em paralelo
      const [conversationsData, usersData] = await Promise.all([
        messageService.getRecentConversations(),
        messageService.getAvailableUsers()
      ]);

      // Marcar usuários como online se tiverem WebSocket conectado (heurística temporária)
      // TODO: Substituir por status real do backend quando implementado
      const usersWithOnlineStatus = Array.isArray(usersData) ? usersData.map(user => {
        // Heurística: se o usuário enviou mensagens recentemente ou está na lista de conversas recentes,
        // considerar como potencialmente online. Isso será substituído por status real do backend.
        const hasRecentActivity = Array.isArray(conversationsData) && conversationsData.some(
          (conv: any) => conv.sender?.id === user.id || conv.recipient?.id === user.id
        );
        return {
          ...user,
          isOnline: user.isOnline || hasRecentActivity || false
        };
      }) : [];

      setConversations(Array.isArray(conversationsData) ? conversationsData : []);
      setAvailableUsers(usersWithOnlineStatus);
      
      console.log('✅ [CHAT] Dados iniciais carregados:', {
        conversations: Array.isArray(conversationsData) ? conversationsData.length : 0,
        users: usersWithOnlineStatus.length,
        conversationsData: conversationsData,
        usersData: usersWithOnlineStatus
      });
    } catch (error) {
      console.error('❌ [CHAT] Erro ao carregar dados iniciais:', error);
      if (error instanceof MessageServiceError) {
        setError(error.message);
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (conversationId: string) => {
    if (!conversationId) return;
    
    setLoading(true);
    console.log('💬 [CHAT] Carregando conversa:', conversationId);
    
    try {
      const messages = await messageService.getConversationMessages(conversationId);
      setChatMessages(messages);
      console.log('✅ [CHAT] Mensagens carregadas:', messages.length);
    } catch (error) {
      console.error('❌ [CHAT] Erro ao carregar conversa:', error);
      if (error instanceof MessageServiceError) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive"
        });
      }
      setChatMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    console.log('📤 [CHAT] Enviando mensagem:', newMessage);

    try {
      const messageData = {
        content: newMessage,
        recipientId: selectedConversation.type === 'individual' ? selectedConversation.id : undefined,
        groupId: selectedConversation.type === 'group' ? selectedConversation.id : undefined,
        departmentId: selectedConversation.type === 'department' ? selectedConversation.id : undefined,
        type: 'TEXT' as const,
        replyToId: replyToMessage?.id
      };

      const sentMessage = await messageService.sendChatMessage(messageData);
      
      // Adicionar mensagem localmente (otimistic update)
      addChatMessage(sentMessage);
      
      // Limpar campos
      setNewMessage('');
      setReplyToMessage(null);

      console.log('✅ [CHAT] Mensagem enviada com sucesso');
      
      toast({
        title: "Sucesso",
        description: "Mensagem enviada",
        variant: "default"
      });

    } catch (error) {
      console.error('❌ [CHAT] Erro ao enviar mensagem:', error);
      if (error instanceof MessageServiceError) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive"
        });
      }
    }
  };

  const editMessage = async (messageId: string, newContent: string) => {
    if (!newContent.trim()) return;

    try {
      const updatedMessage = await messageService.editChatMessage(messageId, newContent);
      updateChatMessage(messageId, updatedMessage);
      
      setEditingMessage(null);
      setEditContent('');
      
      toast({
        title: "Sucesso",
        description: "Mensagem editada",
        variant: "default"
      });
    } catch (error) {
      console.error('❌ [CHAT] Erro ao editar mensagem:', error);
      if (error instanceof MessageServiceError) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive"
        });
      }
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await messageService.markChatMessageAsRead(messageId);
      updateChatMessage(messageId, { isRead: true, readAt: new Date().toISOString() });
    } catch (error) {
      console.error('❌ [CHAT] Erro ao marcar como lida:', error);
    }
  };

  const scrollToBottom = () => {
    // Verificar se o elemento existe antes de fazer scroll
    if (messagesEndRef.current) {
      try {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (error) {
        // Fallback para scroll simples se smooth não funcionar
        messagesEndRef.current.scrollIntoView();
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTyping = () => {
    if (selectedConversation && currentUser && wsConnected) {
      sendTypingEvent(
        selectedConversation.id,
        selectedConversation.type === 'individual' ? selectedConversation.id : undefined,
        selectedConversation.type === 'group' ? selectedConversation.id : undefined,
        selectedConversation.type === 'department' ? selectedConversation.id : undefined
      );
    }
  };

  const getInitials = (name: string | undefined | null) => {
    if (!name || typeof name !== 'string') {
      return '?';
    }
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Funções para ações do menu de contexto
  const handleCopyMessage = (message: ChatMessage) => {
    navigator.clipboard.writeText(message.content);
    toast({
      title: "Copiado",
      description: "Mensagem copiada para a área de transferência",
      variant: "default"
    });
  };

  const handleForwardMessage = (message: ChatMessage) => {
    // TODO: Implementar encaminhamento de mensagem
    toast({
      title: "Em desenvolvimento",
      description: "Funcionalidade de encaminhar mensagem será implementada em breve",
      variant: "default"
    });
  };

  const handlePinMessage = (messageId: string) => {
    setPinnedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
        toast({
          title: "Desfixado",
          description: "Mensagem desfixada",
          variant: "default"
        });
      } else {
        newSet.add(messageId);
        toast({
          title: "Fixado",
          description: "Mensagem fixada",
          variant: "default"
        });
      }
      return newSet;
    });
  };

  const handleFavoriteMessage = (messageId: string) => {
    setFavoriteMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
        toast({
          title: "Removido dos favoritos",
          description: "Mensagem removida dos favoritos",
          variant: "default"
        });
      } else {
        newSet.add(messageId);
        toast({
          title: "Adicionado aos favoritos",
          description: "Mensagem adicionada aos favoritos",
          variant: "default"
        });
      }
      return newSet;
    });
  };

  const handleSelectMessage = (messageId: string) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const handleReportMessage = (message: ChatMessage) => {
    // TODO: Implementar denúncia de mensagem
    toast({
      title: "Em desenvolvimento",
      description: "Funcionalidade de denunciar mensagem será implementada em breve",
      variant: "default"
    });
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (window.confirm('Tem certeza que deseja apagar esta mensagem?')) {
      try {
        // TODO: Implementar chamada à API para deletar mensagem
        removeChatMessage(messageId);
        toast({
          title: "Sucesso",
          description: "Mensagem apagada",
          variant: "default"
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível apagar a mensagem",
          variant: "destructive"
        });
      }
    }
  };

  const handleReaction = (messageId: string, reaction: string) => {
    // TODO: Implementar reações (emoji) nas mensagens
    toast({
      title: "Reação",
      description: `Reação ${reaction} adicionada`,
      variant: "default"
    });
  };

  const startNewConversation = () => {
    let newConversation: Conversation | null = null;

    if (chatType === 'individual' && selectedUser) {
      newConversation = {
        id: selectedUser.id,
        name: selectedUser.name,
        type: 'individual' as const,
        unreadCount: 0,
        isOnline: selectedUser.isOnline
      };
    } else if (chatType === 'group' && selectedGroup) {
      newConversation = {
        id: selectedGroup.id,
        name: selectedGroup.name || selectedGroup.groupName || 'Grupo',
        type: 'group' as const,
        unreadCount: 0,
        isOnline: false
      };
    } else if (chatType === 'department' && selectedDepartment) {
      newConversation = {
        id: selectedDepartment.id,
        name: selectedDepartment.name || 'Departamento',
        type: 'department' as const,
        unreadCount: 0,
        isOnline: false
      };
    }

    if (!newConversation) return;

    setConversations([newConversation, ...conversations]);
    setSelectedConversation(newConversation);
    setShowNewChatModal(false);
    setSelectedUser(null);
    setSelectedGroup(null);
    setSelectedDepartment(null);
    loadConversation(newConversation.id);
  };

  return (
    <MainLayout title="Chat Interno" subtitle="Converse em tempo real com colaboradores, grupos e departamentos">
      <div className="flex h-full gap-6">
        {/* Sidebar - Lista de Conversas */}
        <Card className="w-80 flex flex-col">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Conversas</CardTitle>
                {wsConnected ? (
                  <Wifi className="w-4 h-4 text-green-500" title="Conectado" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" title="Desconectado" />
                )}
              </div>
              
              <Dialog open={showNewChatModal} onOpenChange={setShowNewChatModal}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Nova Conversa
                  </Button>
                </DialogTrigger>
                <DialogContent 
                  className="bg-seguranca-darkgray border-seguranca-gray/30 max-w-md w-[90vw] sm:w-full overflow-visible"
                  style={{ zIndex: 10050 }}
                >
                  <DialogHeader className="pb-4 border-b border-seguranca-gray/20 mb-4">
                    <DialogTitle className="text-seguranca-lightgray text-xl font-semibold">Nova Conversa</DialogTitle>
                    <DialogDescription className="text-seguranca-gray text-sm">
                      Escolha o tipo de conversa e selecione um destinatário
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-seguranca-lightgray block">Tipo de Conversa</label>
                      <Select value={chatType} onValueChange={(value: 'individual' | 'group' | 'department') => {
                        setChatType(value);
                        setSelectedUser(null);
                        setSelectedGroup(null);
                        setSelectedDepartment(null);
                      }}>
                        <SelectTrigger className="bg-seguranca-darkgray border-seguranca-gray/30 text-seguranca-lightgray">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="!bg-seguranca-graphite !border-seguranca-gray/50 shadow-2xl" style={{ backgroundColor: '#1f2937', opacity: 1, backdropFilter: 'none' }}>
                          <SelectItem value="individual" className="text-seguranca-lightgray focus:bg-seguranca-yellow/20 focus:text-seguranca-yellow hover:bg-seguranca-gray/30">Individual</SelectItem>
                          <SelectItem value="group" className="text-seguranca-lightgray focus:bg-seguranca-yellow/20 focus:text-seguranca-yellow hover:bg-seguranca-gray/30">Grupo</SelectItem>
                          <SelectItem value="department" className="text-seguranca-lightgray focus:bg-seguranca-yellow/20 focus:text-seguranca-yellow hover:bg-seguranca-gray/30">Departamento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {chatType === 'individual' && (
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-seguranca-lightgray block">Selecionar Usuário</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="showOnlyOnline"
                              checked={showOnlyOnline}
                              onChange={(e) => setShowOnlyOnline(e.target.checked)}
                              className="w-4 h-4"
                            />
                            <label htmlFor="showOnlyOnline" className="text-xs text-seguranca-gray cursor-pointer">
                              Apenas online
                            </label>
                          </div>
                        </div>
                        <Select onValueChange={(value) => {
                          const user = safeAvailableUsers.find(u => u.id === value);
                          setSelectedUser(user || null);
                        }}>
                          <SelectTrigger className="bg-seguranca-darkgray border-seguranca-gray/30 text-seguranca-lightgray">
                            <SelectValue placeholder="Escolha um usuário" />
                          </SelectTrigger>
                          <SelectContent className="!bg-seguranca-graphite !border-seguranca-gray/50 shadow-2xl max-h-[300px]" style={{ backgroundColor: '#1f2937', opacity: 1, backdropFilter: 'none', zIndex: 10070 }}>
                            {loadingModalUsers ? (
                              <SelectItem value="loading" disabled className="text-seguranca-gray">
                                <div className="flex items-center gap-2">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Carregando usuários...
                                </div>
                              </SelectItem>
                            ) : safeAvailableUsers.length === 0 ? (
                              <SelectItem value="no-users" disabled className="text-seguranca-gray">
                                Nenhum usuário disponível
                              </SelectItem>
                            ) : (
                              safeAvailableUsers
                                .filter(user => user && user.id && user.name)
                                .filter(user => !showOnlyOnline || user.isOnline)
                                .sort((a, b) => {
                                  // Ordenar: online primeiro, depois offline
                                  if (a.isOnline && !b.isOnline) return -1;
                                  if (!a.isOnline && b.isOnline) return 1;
                                  return a.name.localeCompare(b.name);
                                })
                                .map(user => (
                                  <SelectItem key={user.id} value={user.id} className="text-seguranca-lightgray focus:bg-seguranca-yellow/20 focus:text-seguranca-yellow hover:bg-seguranca-gray/30">
                                    <div className="flex items-center gap-2 w-full">
                                      <div className="relative flex-shrink-0">
                                        <Avatar className="w-6 h-6">
                                          <AvatarFallback className="bg-seguranca-yellow/20 text-seguranca-yellow">
                                            {getInitials(user.name)}
                                          </AvatarFallback>
                                        </Avatar>
                                        {user.isOnline && (
                                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-seguranca-darkgray" />
                                        )}
                                      </div>
                                      <span className="flex-1 truncate">{user.name}</span>
                                      {user.isOnline ? (
                                        <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-500 border-green-500/30 flex-shrink-0">
                                          Online
                                        </Badge>
                                      ) : (
                                        <Badge variant="secondary" className="text-xs bg-gray-500/20 text-gray-400 border-gray-500/30 flex-shrink-0">
                                          Offline
                                        </Badge>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {chatType === 'group' && (
                      <div className="space-y-2 pt-2">
                        <label className="text-sm font-medium text-seguranca-lightgray block">Selecionar Grupo</label>
                        <Select onValueChange={(value) => {
                          const group = groups.find(g => g.id === value);
                          setSelectedGroup(group || null);
                        }}>
                          <SelectTrigger className="bg-seguranca-darkgray border-seguranca-gray/30 text-seguranca-lightgray">
                            <SelectValue placeholder={loadingGroups ? "Carregando grupos..." : "Escolha um grupo"} />
                          </SelectTrigger>
                          <SelectContent className="!bg-seguranca-graphite !border-seguranca-gray/50 shadow-2xl" style={{ backgroundColor: '#1f2937', opacity: 1, backdropFilter: 'none', zIndex: 10070 }}>
                            {loadingGroups ? (
                              <SelectItem value="loading" disabled className="text-seguranca-gray">
                                Carregando...
                              </SelectItem>
                            ) : groups.length === 0 ? (
                              <SelectItem value="no-groups" disabled className="text-seguranca-gray">
                                Nenhum grupo disponível
                              </SelectItem>
                            ) : (
                              groups.map(group => (
                                <SelectItem key={group.id} value={group.id} className="text-seguranca-lightgray focus:bg-seguranca-yellow/20 focus:text-seguranca-yellow hover:bg-seguranca-gray/30">
                                  {group.name || group.groupName || 'Grupo sem nome'}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {chatType === 'department' && (
                      <div className="space-y-2 pt-2">
                        <label className="text-sm font-medium text-seguranca-lightgray block">Selecionar Departamento</label>
                        <Select onValueChange={(value) => {
                          const dept = departments.find(d => d.id === value);
                          setSelectedDepartment(dept || null);
                        }}>
                          <SelectTrigger className="bg-seguranca-darkgray border-seguranca-gray/30 text-seguranca-lightgray">
                            <SelectValue placeholder={loadingDepartments ? "Carregando departamentos..." : "Escolha um departamento"} />
                          </SelectTrigger>
                          <SelectContent className="!bg-seguranca-graphite !border-seguranca-gray/50 shadow-2xl" style={{ backgroundColor: '#1f2937', opacity: 1, backdropFilter: 'none', zIndex: 10070 }}>
                            {loadingDepartments ? (
                              <SelectItem value="loading" disabled className="text-seguranca-gray">
                                Carregando...
                              </SelectItem>
                            ) : departments.length === 0 ? (
                              <SelectItem value="no-departments" disabled className="text-seguranca-gray">
                                Nenhum departamento disponível
                              </SelectItem>
                            ) : (
                              departments.map(dept => (
                                <SelectItem key={dept.id} value={dept.id} className="text-seguranca-lightgray focus:bg-seguranca-yellow/20 focus:text-seguranca-yellow hover:bg-seguranca-gray/30">
                                  {dept.name || 'Departamento sem nome'}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex justify-end space-x-2 pt-4 border-t border-seguranca-gray/20 mt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowNewChatModal(false);
                          setSelectedUser(null);
                          setSelectedGroup(null);
                          setSelectedDepartment(null);
                        }}
                        className="border-seguranca-gray/30 text-seguranca-lightgray hover:bg-seguranca-gray/10"
                      >
                        Cancelar
                      </Button>
                      <Button 
                        onClick={startNewConversation} 
                        disabled={
                          (chatType === 'individual' && !selectedUser) ||
                          (chatType === 'group' && !selectedGroup) ||
                          (chatType === 'department' && !selectedDepartment)
                        }
                        className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Iniciar Conversa
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar conversas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 p-0">
            {error && (
              <Alert className="m-4 mb-2" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="h-full overflow-y-auto">
              <div className="space-y-1">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="ml-2">Carregando...</span>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p>Nenhuma conversa encontrada</p>
                    <p className="text-sm">Inicie uma nova conversa</p>
                  </div>
                ) : (
                  filteredConversations
                    .filter(conversation => conversation && conversation.id) // Filtrar conversas válidas
                    .map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedConversation?.id === conversation.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => {
                        setSelectedConversation(conversation);
                        loadConversation(conversation.id);
                      }}
                    >
                                              <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback>{getInitials(conversation.name)}</AvatarFallback>
                            </Avatar>
                            {conversation.isOnline && (
                              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm truncate">{conversation.name || 'Conversa sem nome'}</p>
                            {conversation.lastMessage && (
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(conversation.lastMessage.createdAt), 'HH:mm')}
                              </span>
                            )}
                          </div>
                          {conversation.lastMessage && (
                            <p className="text-xs text-muted-foreground truncate">
                              {conversation.lastMessage.content}
                            </p>
                          )}
                        </div>
                        {conversation.unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Área Principal do Chat */}
        <Card className="flex-1 flex flex-col">
          {selectedConversation && selectedConversation.id ? (
            <>
              {/* Header da Conversa */}
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>{getInitials(selectedConversation.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{selectedConversation.name || 'Conversa sem nome'}</CardTitle>
                      <div className="flex items-center gap-2">
                        {selectedConversation.isOnline && (
                          <Badge variant="secondary" className="text-xs">Online</Badge>
                        )}
                        {typingUsers.size > 0 && (
                          <span className="text-xs text-muted-foreground">digitando...</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Opções da Conversa</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => {
                        if (selectedConversation) {
                          toast({
                            title: "Informações",
                            description: `Conversa: ${selectedConversation.name}\nTipo: ${selectedConversation.type}\nMensagens não lidas: ${selectedConversation.unreadCount}`,
                            variant: "default"
                          });
                        }
                      }}>
                        <Info className="mr-2 h-4 w-4" />
                        Informações
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        if (selectedConversation) {
                          // Marcar todas as mensagens como lidas
                          safeChatMessages.forEach(msg => {
                            if (!msg.isRead) {
                              markAsRead(msg.id);
                            }
                          });
                          toast({
                            title: "Sucesso",
                            description: "Todas as mensagens foram marcadas como lidas",
                            variant: "default"
                          });
                        }
                      }}>
                        <Archive className="mr-2 h-4 w-4" />
                        Marcar todas como lidas
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => {
                          if (selectedConversation && window.confirm('Tem certeza que deseja limpar esta conversa?')) {
                            setChatMessages([]);
                            toast({
                              title: "Sucesso",
                              description: "Conversa limpa",
                              variant: "default"
                            });
                          }
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Limpar conversa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              {/* Área de Mensagens */}
              <CardContent className="flex-1 p-0 flex flex-col">
                <div className="flex-1 px-4 overflow-y-auto">
                  <div className="space-y-4 py-4">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="ml-2">Carregando mensagens...</span>
                      </div>
                    ) : safeChatMessages.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p>Nenhuma mensagem ainda</p>
                        <p className="text-sm">Inicie a conversa!</p>
                      </div>
                    ) : (
                      safeChatMessages.map((message) => {
                        const isCurrentUser = message.sender.id === currentUser?.id || message.sender.id === currentUser?.username;
                        
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-xs lg:max-w-md ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                              {!isCurrentUser && (
                                <div className="flex items-center gap-2 mb-1">
                                  <Avatar className="w-6 h-6">
                                    <AvatarFallback>{getInitials(message.sender.name)}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs font-medium">{message.sender.name}</span>
                                </div>
                              )}
                              
                              {message.replyToId && replyToMessage && (
                                <div className="bg-muted/50 p-2 rounded-t-lg border-l-2 border-primary mb-1">
                                  <p className="text-xs text-muted-foreground">Respondendo a {replyToMessage.sender.name}</p>
                                  <p className="text-xs truncate">{replyToMessage.content}</p>
                                </div>
                              )}
                              
                              <ContextMenu>
                                <ContextMenuTrigger asChild>
                                  <div
                                    className={`p-3 rounded-lg cursor-pointer transition-all hover:opacity-90 ${
                                      isCurrentUser
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted'
                                    } ${selectedMessages.has(message.id) ? 'ring-2 ring-seguranca-yellow' : ''}`}
                                  >
                                    {editingMessage === message.id ? (
                                      <div className="space-y-2">
                                        <Textarea
                                          value={editContent}
                                          onChange={(e) => setEditContent(e.target.value)}
                                          className="min-h-[60px]"
                                        />
                                        <div className="flex gap-2">
                                          <Button size="sm" onClick={() => editMessage(message.id, editContent)}>
                                            Salvar
                                          </Button>
                                          <Button size="sm" variant="outline" onClick={() => setEditingMessage(null)}>
                                            Cancelar
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div>
                                        <div className="flex items-start justify-between gap-2">
                                          <p className="text-sm flex-1">{message.content}</p>
                                          {pinnedMessages.has(message.id) && (
                                            <Pin className="w-3 h-3 opacity-70 flex-shrink-0" />
                                          )}
                                          {favoriteMessages.has(message.id) && (
                                            <Star className="w-3 h-3 opacity-70 flex-shrink-0 fill-yellow-400 text-yellow-400" />
                                          )}
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                          <span className="text-xs opacity-70">
                                            {format(new Date(message.createdAt), 'HH:mm', { locale: ptBR })}
                                            {message.editedAt && ' (editada)'}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </ContextMenuTrigger>
                                <ContextMenuContent className="w-56 bg-seguranca-graphite border-seguranca-gray/50">
                                  {/* Reações rápidas */}
                                  <div className="flex items-center justify-around p-2 border-b border-seguranca-gray/30">
                                    <button
                                      onClick={() => handleReaction(message.id, '👍')}
                                      className="p-2 hover:bg-seguranca-gray/30 rounded-full transition-colors"
                                      title="Curtir"
                                    >
                                      <span className="text-xl">👍</span>
                                    </button>
                                    <button
                                      onClick={() => handleReaction(message.id, '❤️')}
                                      className="p-2 hover:bg-seguranca-gray/30 rounded-full transition-colors"
                                      title="Curtir com coração"
                                    >
                                      <span className="text-xl">❤️</span>
                                    </button>
                                    <button
                                      onClick={() => handleReaction(message.id, '😂')}
                                      className="p-2 hover:bg-seguranca-gray/30 rounded-full transition-colors"
                                      title="Rir"
                                    >
                                      <span className="text-xl">😂</span>
                                    </button>
                                    <button
                                      onClick={() => handleReaction(message.id, '😮')}
                                      className="p-2 hover:bg-seguranca-gray/30 rounded-full transition-colors"
                                      title="Surpreso"
                                    >
                                      <span className="text-xl">😮</span>
                                    </button>
                                    <button
                                      onClick={() => handleReaction(message.id, '😢')}
                                      className="p-2 hover:bg-seguranca-gray/30 rounded-full transition-colors"
                                      title="Triste"
                                    >
                                      <span className="text-xl">😢</span>
                                    </button>
                                    <button
                                      onClick={() => handleReaction(message.id, '🙏')}
                                      className="p-2 hover:bg-seguranca-gray/30 rounded-full transition-colors"
                                      title="Obrigado"
                                    >
                                      <span className="text-xl">🙏</span>
                                    </button>
                                    <button
                                      onClick={() => handleReaction(message.id, '+')}
                                      className="p-2 hover:bg-seguranca-gray/30 rounded-full transition-colors"
                                      title="Mais reações"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                  </div>
                                  
                                  {/* Opções do menu */}
                                  <ContextMenuItem
                                    onClick={() => setReplyToMessage(message)}
                                    className="text-seguranca-lightgray focus:bg-seguranca-yellow/20 focus:text-seguranca-yellow"
                                  >
                                    <Reply className="mr-2 h-4 w-4" />
                                    Responder
                                  </ContextMenuItem>
                                  <ContextMenuItem
                                    onClick={() => handleCopyMessage(message)}
                                    className="text-seguranca-lightgray focus:bg-seguranca-yellow/20 focus:text-seguranca-yellow"
                                  >
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copiar
                                  </ContextMenuItem>
                                  <ContextMenuItem
                                    onClick={() => handleForwardMessage(message)}
                                    className="text-seguranca-lightgray focus:bg-seguranca-yellow/20 focus:text-seguranca-yellow"
                                  >
                                    <Forward className="mr-2 h-4 w-4" />
                                    Encaminhar
                                  </ContextMenuItem>
                                  <ContextMenuItem
                                    onClick={() => handlePinMessage(message.id)}
                                    className="text-seguranca-lightgray focus:bg-seguranca-yellow/20 focus:text-seguranca-yellow"
                                  >
                                    <Pin className={`mr-2 h-4 w-4 ${pinnedMessages.has(message.id) ? 'fill-current' : ''}`} />
                                    {pinnedMessages.has(message.id) ? 'Desfixar' : 'Fixar'}
                                  </ContextMenuItem>
                                  <ContextMenuItem
                                    onClick={() => handleFavoriteMessage(message.id)}
                                    className="text-seguranca-lightgray focus:bg-seguranca-yellow/20 focus:text-seguranca-yellow"
                                  >
                                    <Star className={`mr-2 h-4 w-4 ${favoriteMessages.has(message.id) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                                    {favoriteMessages.has(message.id) ? 'Remover dos favoritos' : 'Favoritar'}
                                  </ContextMenuItem>
                                  <ContextMenuItem
                                    onClick={() => handleSelectMessage(message.id)}
                                    className="text-seguranca-lightgray focus:bg-seguranca-yellow/20 focus:text-seguranca-yellow"
                                  >
                                    <CheckSquare className={`mr-2 h-4 w-4 ${selectedMessages.has(message.id) ? 'fill-current' : ''}`} />
                                    {selectedMessages.has(message.id) ? 'Desselecionar' : 'Selecionar'}
                                  </ContextMenuItem>
                                  {!isCurrentUser && (
                                    <ContextMenuItem
                                      onClick={() => handleReportMessage(message)}
                                      className="text-seguranca-lightgray focus:bg-seguranca-yellow/20 focus:text-seguranca-yellow"
                                    >
                                      <Flag className="mr-2 h-4 w-4" />
                                      Denunciar
                                    </ContextMenuItem>
                                  )}
                                  {isCurrentUser && (
                                    <>
                                      <ContextMenuSeparator />
                                      <ContextMenuItem
                                        onClick={() => {
                                          setEditingMessage(message.id);
                                          setEditContent(message.content);
                                        }}
                                        className="text-seguranca-lightgray focus:bg-seguranca-yellow/20 focus:text-seguranca-yellow"
                                      >
                                        <Edit className="mr-2 h-4 w-4" />
                                        Editar
                                      </ContextMenuItem>
                                      <ContextMenuItem
                                        onClick={() => handleDeleteMessage(message.id)}
                                        className="text-red-600 focus:bg-red-600/20 focus:text-red-600"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Apagar
                                      </ContextMenuItem>
                                    </>
                                  )}
                                </ContextMenuContent>
                              </ContextMenu>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Área de Input */}
                <div className="p-4 border-t">
                  {replyToMessage && (
                    <div className="bg-muted/50 p-2 rounded-lg mb-2 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Respondendo a {replyToMessage.sender.name}</p>
                        <p className="text-sm truncate">{replyToMessage.content}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReplyToMessage(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Digite sua mensagem..."
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        handleTyping();
                      }}
                      onKeyPress={handleKeyPress}
                      className="min-h-[60px] resize-none"
                      disabled={loading}
                    />
                    <Button 
                      onClick={sendMessage} 
                      disabled={!newMessage.trim() || loading}
                      className="self-end"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">Selecione uma conversa</h3>
                <p>Escolha uma conversa existente ou inicie uma nova</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </MainLayout>
  );
};

export default ChatInterno;