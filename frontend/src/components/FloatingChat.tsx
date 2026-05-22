import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMessageStore, Conversation, ChatMessage, User } from '../stores/messageStore';
import { messageService } from '../services/messageService';
import { 
  MessageCircle, 
  X, 
  Minus, 
  Maximize2, 
  ChevronLeft, 
  Send, 
  Search, 
  User as UserIcon, 
  Users, 
  Loader2, 
  Clock 
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const FloatingChat: React.FC = () => {
  const {
    conversations,
    selectedConversation,
    chatMessages,
    availableUsers,
    isFloatingChatOpen,
    setSelectedConversation,
    setChatMessages,
    addChatMessage,
    setIsFloatingChatOpen
  } = useMessageStore();

  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'conversations' | 'contacts'>('conversations');
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;

  // Carregar mensagens quando a conversa muda
  useEffect(() => {
    if (!selectedConversation) return;

    const loadConversationMessages = async () => {
      setLoadingMessages(true);
      try {
        let msgs: ChatMessage[] = [];
        if (selectedConversation.type === 'group') {
          msgs = await messageService.getGroupMessages(selectedConversation.id);
        } else if (selectedConversation.type === 'department') {
          msgs = await messageService.getDepartmentMessages(selectedConversation.id);
        } else {
          msgs = await messageService.getConversationMessages(selectedConversation.id);
        }
        setChatMessages(msgs);
      } catch (err) {
        console.error('[FloatingChat] Erro ao carregar mensagens:', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadConversationMessages();
  }, [selectedConversation?.id, selectedConversation?.type, setChatMessages]);

  // Rolar para baixo automaticamente ao abrir ou receber nova mensagem
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, selectedConversation, isMinimized]);

  // Filtrar conversas válidas e aplicar busca
  const filteredConversations = useMemo(() => {
    const valid = (conversations || []).filter(c => 
      c && 
      c.id && 
      c.name && 
      c.name.trim() !== '' && 
      c.name !== 'Conversa sem nome' &&
      (c.type !== 'individual' || c.id !== currentUser?.id)
    );

    if (!searchTerm.trim()) return valid;
    return valid.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [conversations, searchTerm, currentUser?.id]);

  // Filtrar contatos (usuários disponíveis) e aplicar busca
  const filteredContacts = useMemo(() => {
    const valid = (availableUsers || []).filter(u => u && u.id !== currentUser?.id);
    if (!searchTerm.trim()) return valid;
    return valid.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [availableUsers, searchTerm, currentUser?.id]);

  // Filtrar as mensagens da conversa selecionada atual
  const safeChatMessages = useMemo(() => {
    if (!selectedConversation || !Array.isArray(chatMessages)) return [];

    return chatMessages.filter((message) => {
      if (selectedConversation.type === 'individual') {
        return (
          message.recipient?.id === selectedConversation.id ||
          message.sender?.id === selectedConversation.id ||
          (message.recipient?.id === currentUser?.id && message.sender?.id === selectedConversation.id) ||
          (message.sender?.id === currentUser?.id && message.recipient?.id === selectedConversation.id)
        );
      }
      if (selectedConversation.type === 'group') {
        return message.group?.id === selectedConversation.id;
      }
      if (selectedConversation.type === 'department') {
        return message.department?.id === selectedConversation.id;
      }
      return false;
    });
  }, [chatMessages, selectedConversation, currentUser?.id]);

  // Enviar mensagem
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    const tempMessageId = `temp-${Date.now()}`;
    const tempMessage: ChatMessage = {
      id: tempMessageId,
      content,
      sender: currentUser || { id: '', name: 'Você', email: '' },
      type: 'TEXT',
      isRead: false,
      createdAt: new Date().toISOString()
    };
    
    // Adicionar localmente antes de enviar
    addChatMessage(tempMessage);

    try {
      const messageData = {
        content,
        recipientId: selectedConversation.type === 'individual' ? selectedConversation.id : undefined,
        groupId: selectedConversation.type === 'group' ? selectedConversation.id : undefined,
        departmentId: selectedConversation.type === 'department' ? selectedConversation.id : undefined,
        type: 'TEXT' as const
      };

      const sentMessage = await messageService.sendChatMessage(messageData);
      
      // Substituir a temporária pela real no Zustand
      useMessageStore.setState(state => ({
        chatMessages: (state.chatMessages || []).map(m => m.id === tempMessageId ? sentMessage : m)
      }));
    } catch (err) {
      console.error('[FloatingChat] Erro ao enviar mensagem:', err);
      // Remover a temporária se falhar
      useMessageStore.setState(state => ({
        chatMessages: (state.chatMessages || []).filter(m => m.id !== tempMessageId)
      }));
    } finally {
      setSending(false);
    }
  };

  // Iniciar conversa com um contato
  const startChatWithContact = (contact: User) => {
    const existing = (conversations || []).find(c => c.id === contact.id && c.type === 'individual');
    if (existing) {
      setSelectedConversation(existing);
    } else {
      setSelectedConversation({
        id: contact.id,
        name: contact.name,
        type: 'individual',
        unreadCount: 0,
        isOnline: contact.isOnline || false
      });
    }
  };

  // Contagem de conversas com mensagens não lidas
  const unreadTotal = useMemo(() => {
    return (conversations || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }, [conversations]);

  if (!isFloatingChatOpen) return null;

  // 1. Renderizar modo MINIMIZADO (Pílula no canto inferior direito)
  if (isMinimized) {
    return (
      <div 
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 md:right-8 z-50 bg-seguranca-black hover:bg-slate-900 border border-gray-700/80 rounded-full px-5 py-3 shadow-2xl flex items-center space-x-3 cursor-pointer hover:border-seguranca-yellow transition-all duration-300 transform hover:scale-105 select-none"
      >
        <div className="relative">
          <MessageCircle className="h-5 w-5 text-seguranca-yellow" />
          {unreadTotal > 0 && (
            <span className="absolute -top-2 -right-2 bg-seguranca-yellow text-seguranca-black font-extrabold text-[10px] h-4 w-4 rounded-full flex items-center justify-center animate-bounce">
              {unreadTotal}
            </span>
          )}
        </div>
        <span className="text-seguranca-lightgray text-sm font-semibold">
          {selectedConversation ? `Chat: ${selectedConversation.name}` : 'Chat Interno'}
        </span>
        <Maximize2 className="h-4 w-4 text-gray-500 hover:text-seguranca-yellow" />
      </div>
    );
  }

  // 2. Renderizar modo EXPANDIDO (Janela de chat flutuante)
  return (
    <div className="fixed bottom-0 right-4 md:right-8 z-50 w-96 h-[500px] bg-seguranca-black/95 backdrop-blur-md border border-gray-700/80 shadow-2xl rounded-t-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-300 select-none">
      {/* HEADER DA JANELA */}
      <div className="bg-seguranca-black border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {selectedConversation ? (
            <button 
              onClick={() => setSelectedConversation(null)}
              className="text-gray-400 hover:text-seguranca-yellow p-1 rounded-lg hover:bg-gray-800/50 transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : (
            <MessageCircle className="h-5 w-5 text-seguranca-yellow" />
          )}
          <span className="font-semibold text-seguranca-lightgray text-sm truncate max-w-[200px]">
            {selectedConversation ? selectedConversation.name : 'Chat Interno'}
          </span>
          {selectedConversation?.type === 'individual' && (
            <span className={`h-2.5 w-2.5 rounded-full ${selectedConversation.isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-gray-600'}`} />
          )}
        </div>

        <div className="flex items-center space-x-1">
          <button 
            onClick={() => setIsMinimized(true)}
            title="Minimizar"
            className="text-gray-400 hover:text-seguranca-yellow p-1.5 rounded-lg hover:bg-gray-800/50 transition-all"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setIsFloatingChatOpen(false)}
            title="Fechar"
            className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-gray-800/50 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL (TELA DE CHAT ATIVO VS TELA DE LISTAGENS) */}
      {selectedConversation ? (
        // TELA DE CONVERSA ATIVA
        <div className="flex-1 flex flex-col overflow-hidden bg-seguranca-graphite/40">
          {/* PAINEL DE MENSAGENS */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-800">
            {loadingMessages ? (
              <div className="h-full flex items-center justify-center flex-col space-y-2">
                <Loader2 className="h-6 w-6 text-seguranca-yellow animate-spin" />
                <span className="text-xs text-gray-500">Carregando histórico...</span>
              </div>
            ) : safeChatMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center flex-col text-center p-4">
                <MessageCircle className="h-8 w-8 text-gray-600 mb-2 opacity-55" />
                <span className="text-xs text-gray-500 font-medium">Nenhuma mensagem nesta conversa.</span>
                <span className="text-[10px] text-gray-600 mt-1">Envie uma mensagem abaixo para começar.</span>
              </div>
            ) : (
              safeChatMessages.map((msg) => {
                const isMe = msg.sender.id === currentUser?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs shadow-md border ${
                      isMe 
                        ? 'bg-seguranca-yellow text-seguranca-black font-medium rounded-tr-none border-amber-500/20' 
                        : 'bg-seguranca-black text-seguranca-lightgray rounded-tl-none border-gray-800'
                    }`}>
                      {!isMe && selectedConversation.type !== 'individual' && (
                        <div className="font-extrabold text-[10px] text-seguranca-yellow mb-1 truncate">
                          {msg.sender.name}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap leading-relaxed break-words">{msg.content}</p>
                      <div className={`flex items-center justify-end space-x-1 mt-1 text-[9px] ${isMe ? 'text-seguranca-black/60' : 'text-gray-500'}`}>
                        <Clock className="h-2.5 w-2.5" />
                        <span>
                          {msg.createdAt ? format(new Date(msg.createdAt), 'HH:mm') : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT DE ENVIO DE TEXTO */}
          <form onSubmit={handleSendMessage} className="bg-seguranca-black border-t border-gray-800 p-3 flex items-center space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1 min-w-0 bg-seguranca-graphite border border-gray-800 rounded-xl px-3 py-2 text-xs text-seguranca-lightgray placeholder-gray-500 focus:outline-none focus:border-seguranca-yellow transition-all"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="bg-seguranca-yellow text-seguranca-black hover:bg-yellow-400 p-2 rounded-xl disabled:opacity-50 disabled:hover:bg-seguranca-yellow transition-all flex items-center justify-center shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : (
        // TELA DE SELEÇÃO: CONVERSAS VS CONTATOS
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* ABAS */}
          <div className="flex border-b border-gray-850 bg-seguranca-black px-2">
            <button
              onClick={() => { setActiveTab('conversations'); setSearchTerm(''); }}
              className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-all flex items-center justify-center space-x-2 ${
                activeTab === 'conversations'
                  ? 'border-seguranca-yellow text-seguranca-yellow'
                  : 'border-transparent text-gray-500 hover:text-gray-400'
              }`}
            >
              <MessageCircle className="h-4 w-4" />
              <span>Conversas</span>
            </button>
            <button
              onClick={() => { setActiveTab('contacts'); setSearchTerm(''); }}
              className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-all flex items-center justify-center space-x-2 ${
                activeTab === 'contacts'
                  ? 'border-seguranca-yellow text-seguranca-yellow'
                  : 'border-transparent text-gray-500 hover:text-gray-400'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Contatos</span>
            </button>
          </div>

          {/* BARRA DE PESQUISA */}
          <div className="p-3 bg-seguranca-black">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={activeTab === 'conversations' ? 'Buscar conversas...' : 'Buscar contatos...'}
                className="w-full bg-seguranca-graphite border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-xs text-seguranca-lightgray placeholder-gray-500 focus:outline-none focus:border-seguranca-yellow transition-all"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-seguranca-yellow"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* LISTA FILTRADA */}
          <div className="flex-1 overflow-y-auto px-2 pb-3 scrollbar-thin scrollbar-thumb-gray-800 space-y-1">
            {activeTab === 'conversations' ? (
              // RENDER CONVERSAS RECENTES
              filteredConversations.length === 0 ? (
                <div className="h-full flex items-center justify-center flex-col text-center p-6 mt-4">
                  <MessageCircle className="h-8 w-8 text-gray-600 mb-2 opacity-50" />
                  <span className="text-xs text-gray-500">Nenhuma conversa encontrada</span>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <div
                    key={`${conv.type}-${conv.id}`}
                    onClick={() => setSelectedConversation(conv)}
                    className="w-full text-left p-3 rounded-xl hover:bg-seguranca-graphite cursor-pointer transition-all flex items-center justify-between border border-transparent hover:border-gray-800"
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <div className="relative shrink-0">
                        <div className="h-9 w-9 rounded-full bg-seguranca-graphite flex items-center justify-center border border-gray-700">
                          {conv.type === 'individual' ? (
                            <UserIcon className="h-4 w-4 text-seguranca-yellow" />
                          ) : (
                            <Users className="h-4 w-4 text-seguranca-yellow" />
                          )}
                        </div>
                        {conv.type === 'individual' && conv.isOnline && (
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-seguranca-black shadow-sm" />
                        )}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-xs text-seguranca-lightgray truncate">{conv.name}</div>
                        {conv.lastMessage && (
                          <div className="text-[10px] text-gray-500 truncate mt-0.5">
                            {conv.lastMessage.content}
                          </div>
                        )}
                      </div>
                    </div>

                    {conv.unreadCount > 0 && (
                      <span className="bg-seguranca-yellow text-seguranca-black font-extrabold text-[10px] h-5 w-5 rounded-full flex items-center justify-center shrink-0 ml-2 shadow-md">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                ))
              )
            ) : (
              // RENDER TODOS OS CONTATOS (USUÁRIOS)
              filteredContacts.length === 0 ? (
                <div className="h-full flex items-center justify-center flex-col text-center p-6 mt-4">
                  <UserIcon className="h-8 w-8 text-gray-600 mb-2 opacity-50" />
                  <span className="text-xs text-gray-500">Nenhum contato encontrado</span>
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => startChatWithContact(contact)}
                    className="w-full text-left p-3 rounded-xl hover:bg-seguranca-graphite cursor-pointer transition-all flex items-center space-x-3 border border-transparent hover:border-gray-800"
                  >
                    <div className="relative shrink-0">
                      <div className="h-9 w-9 rounded-full bg-seguranca-graphite flex items-center justify-center border border-gray-700">
                        <UserIcon className="h-4 w-4 text-seguranca-yellow" />
                      </div>
                      {contact.isOnline && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-seguranca-black" />
                      )}
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-xs text-seguranca-lightgray truncate">{contact.name}</div>
                      <div className="text-[10px] text-gray-500 truncate mt-0.5">{contact.email}</div>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};
