import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Interfaces unificadas
export interface WebSocketConnection {
    client: unknown;
    sendEvent: (destination: string, body: Record<string, unknown>) => boolean;
    sendTyping: (conversationId: string, recipientId?: string, groupId?: string, departmentId?: string) => boolean;
    isConnected: boolean;
}

export interface User {
    id: string;
    name: string;
    email: string;
    username?: string;
    avatar?: string;
    department?: string;
    isOnline?: boolean;
}

export interface ReactionSummary {
    emoji: string;
    count: number;
    userIds: string[];
    currentUserReacted?: boolean;
}

export interface ChatMessage {
    id: string;
    content: string;
    sender: User;
    recipient?: User;
    group?: { id: string; name: string };
    department?: { id: string; name: string };
    type: 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO' | 'SYSTEM';
    isRead: boolean;
    readAt?: string;
    editedAt?: string;
    replyToId?: string;
    replyToMessage?: ChatMessage;
    reactions?: ReactionSummary[];
    // Informações do arquivo
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    fileContentType?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface Conversation {
    id: string;
    name: string;
    type: 'individual' | 'group' | 'department';
    lastMessage?: ChatMessage;
    unreadCount: number;
    isOnline?: boolean;
    participants?: User[];
}

export interface SystemMessage {
    id: string;
    title: string;
    content: string;
    type: 'INDIVIDUAL' | 'GROUP' | 'GLOBAL';
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    status: 'UNREAD' | 'READ' | 'ARCHIVED';
    sender: User;
    recipients?: User[];
    departments?: { id: string; name: string }[];
    createdAt: string;
    readAt?: string;
    scheduledAt?: string;
    sentAt?: string;
    replyToId?: string;
    replyTo?: SystemMessage;
}

export function resolveConversationFromMessage(
    message: ChatMessage,
    currentUserId: string | undefined
): {
    conversationId: string;
    conversationType: 'individual' | 'group' | 'department';
    conversationName: string;
} | null {
    if (message.group?.id) {
        return {
            conversationId: message.group.id,
            conversationType: 'group',
            conversationName: message.group.name || 'Grupo',
        };
    }
    if (message.department?.id) {
        return {
            conversationId: message.department.id,
            conversationType: 'department',
            conversationName: message.department.name || 'Departamento',
        };
    }
    if (!currentUserId) return null;
    const sender = message.sender;
    const recipient = message.recipient;
    const other = sender?.id === currentUserId ? recipient : sender;
    if (!other?.id || other.id === currentUserId) return null;
    return {
        conversationId: other.id,
        conversationType: 'individual',
        conversationName: other.name || other.username || other.email || 'Usuário',
    };
}

interface MessageState {
    // Chat state
    conversations: Conversation[];
    selectedConversation: Conversation | null;
    chatMessages: ChatMessage[];
    availableUsers: User[];

    // System messages state
    systemMessages: SystemMessage[];
    unreadSystemCount: number;

    // UI state
    loading: boolean;
    error: string | null;
    searchTerm: string;
    typingUsers: Set<string>;
    isFloatingChatOpen: boolean;
    latestIncomingChatMessage: ChatMessage | null;

    // WebSocket connection
    wsConnection: WebSocketConnection | null;
    isConnected: boolean;

    // Actions
    setConversations: (conversations: Conversation[]) => void;
    setSelectedConversation: (conversation: Conversation | null) => void;
    setChatMessages: (messages: ChatMessage[]) => void;
    addChatMessage: (message: ChatMessage) => void;
    updateChatMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
    removeChatMessage: (messageId: string) => void;

    setAvailableUsers: (users: User[]) => void;
    updateUserStatus: (userId: string, isOnline: boolean) => void;
    setSystemMessages: (messages: SystemMessage[]) => void;
    addSystemMessage: (message: SystemMessage) => void;
    updateSystemMessage: (messageId: string, updates: Partial<SystemMessage>) => void;

    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setSearchTerm: (term: string) => void;

    addTypingUser: (userId: string) => void;
    removeTypingUser: (userId: string) => void;

    setWsConnection: (connection: WebSocketConnection | null) => void;
    setIsConnected: (connected: boolean) => void;
    setIsFloatingChatOpen: (isOpen: boolean) => void;
    setLatestIncomingChatMessage: (msg: ChatMessage | null) => void;
    dismissChatHeaderAlert: () => void;
    clearConversationUnread: (conversationId: string, conversationType: Conversation['type']) => void;
    hydrateConversationsFromRecentMessages: (messages: ChatMessage[]) => void;

    // Computed getters
    getUnreadChatCount: () => number;
    getFilteredConversations: () => Conversation[];
    getCurrentUser: () => User | null;
}

export const useMessageStore = create<MessageState>()(
    devtools(
        (set, get) => ({
            // Initial state
            conversations: [],
            selectedConversation: null,
            chatMessages: [],
            availableUsers: [],
            systemMessages: [],
            unreadSystemCount: 0,
            loading: false,
            error: null,
            searchTerm: '',
            typingUsers: new Set(),
            wsConnection: null,
            isConnected: false,
            isFloatingChatOpen: false,
            latestIncomingChatMessage: null,

            // Actions
            setConversations: (conversations) => {
                const validConversations = Array.isArray(conversations) ? conversations : [];
                // Deduplicar conversas por ID e tipo
                const uniqueConversations = validConversations.reduce((acc, conv) => {
                    if (!conv || !conv.id) return acc;
                    const key = `${conv.type}-${conv.id}`;
                    const existing = acc.find(c => `${c.type}-${c.id}` === key);
                    if (!existing) {
                        acc.push(conv);
                    } else {
                        // Manter a conversa com mais informações (nome, última mensagem, etc)
                        const betterConv = conv.name && conv.name !== 'Conversa sem nome' 
                            ? conv 
                            : existing.name && existing.name !== 'Conversa sem nome'
                                ? existing
                                : conv.lastMessage?.createdAt && existing.lastMessage?.createdAt
                                    ? (new Date(conv.lastMessage.createdAt) > new Date(existing.lastMessage.createdAt) ? conv : existing)
                                    : conv;
                        const index = acc.indexOf(existing);
                        acc[index] = betterConv;
                    }
                    return acc;
                }, [] as Conversation[]);
                // Ordenar por última mensagem (mais recente primeiro)
                uniqueConversations.sort((a, b) => {
                    const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
                    const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
                    return bTime - aTime;
                });
                set({ conversations: uniqueConversations });
            },

            setSelectedConversation: (conversation) => {
                set((state) => {
                    const updates: Partial<MessageState> = {
                        selectedConversation: conversation,
                        latestIncomingChatMessage: null,
                    };
                    if (conversation) {
                        updates.chatMessages = [];
                        updates.conversations = (Array.isArray(state.conversations) ? state.conversations : []).map(
                            (conv) =>
                                conv.id === conversation.id && conv.type === conversation.type
                                    ? { ...conv, unreadCount: 0 }
                                    : conv
                        );
                    }
                    return updates;
                });
            },

            setChatMessages: (messages) => set({ 
                chatMessages: Array.isArray(messages) ? messages : [] 
            }),

            addChatMessage: (message) => set((state) => {
                // Verificar se a mensagem já existe (evitar duplicatas)
                const messageExists = Array.isArray(state.chatMessages) && 
                    state.chatMessages.some(msg => msg.id === message.id);
                
                if (messageExists) {
                    console.log('[Store] Mensagem já existe, ignorando:', message.id);
                    return state;
                }
                
                const currentUser = state.getCurrentUser();
                const resolved = resolveConversationFromMessage(message, currentUser?.id);
                const conversationId = resolved?.conversationId;
                const conversationType = resolved?.conversationType ?? 'individual';
                const conversationName = resolved?.conversationName ?? 'Conversa sem nome';
                
                // Adicionar mensagem ao array
                const updatedMessages = Array.isArray(state.chatMessages) 
                    ? [...state.chatMessages, message]
                    : [message];
                
                // Verificar se a conversa já existe (usando chave única: type-id)
                const conversations = Array.isArray(state.conversations) ? state.conversations : [];
                const conversationKey = conversationId ? `${conversationType}-${conversationId}` : null;
                const existingConversationIndex = conversationKey ? conversations.findIndex(conv => {
                    const convKey = `${conv.type}-${conv.id}`;
                    return convKey === conversationKey;
                }) : -1;
                
                let updatedConversations: Conversation[];
                
                const isIncoming =
                    Boolean(currentUser?.id && message.sender?.id && message.sender.id !== currentUser.id);
                const isViewingConversation =
                    state.selectedConversation?.id === conversationId &&
                    state.selectedConversation?.type === conversationType &&
                    (state.isFloatingChatOpen || window.location.pathname.includes('/chat'));

                if (existingConversationIndex >= 0) {
                    // Conversa existe, atualizar
                    updatedConversations = conversations.map((conv, index) => {
                        if (index === existingConversationIndex) {
                            const shouldIncrementUnread =
                                isIncoming && !message.isRead && !isViewingConversation;
                            return {
                                ...conv,
                                lastMessage: message,
                                unreadCount: shouldIncrementUnread ? conv.unreadCount + 1 : conv.unreadCount,
                                isOnline: conversationType === 'individual' && message.sender?.isOnline ? true : conv.isOnline
                            };
                        }
                        return conv;
                    });
                    
                    // Mover conversa atualizada para o topo
                    const updatedConv = updatedConversations[existingConversationIndex];
                    updatedConversations.splice(existingConversationIndex, 1);
                    updatedConversations.unshift(updatedConv);
                } else if (conversationId) {
                    // Conversa não existe, criar nova apenas se tiver informações suficientes
                    // Não criar conversas vazias ou sem nome adequado
                    if (conversationName && conversationName !== 'Conversa sem nome') {
                        const shouldCountUnread =
                            isIncoming && !message.isRead && !isViewingConversation;
                        const newConversation: Conversation = {
                            id: conversationId,
                            name: conversationName,
                            type: conversationType,
                            lastMessage: message,
                            unreadCount: shouldCountUnread ? 1 : 0,
                            isOnline: conversationType === 'individual' && message.sender?.isOnline ? true : false
                        };
                        // Adicionar no início da lista
                        updatedConversations = [newConversation, ...conversations];
                        console.log('[Store] Nova conversa criada:', newConversation);
                    } else {
                        // Se não tem nome adequado, não criar a conversa ainda
                        // Ela será criada quando o backend retornar ou quando tiver mais informações
                        updatedConversations = conversations;
                        console.log('[Store] Conversa sem nome adequado, ignorando criação automática');
                    }
                } else {
                    updatedConversations = conversations;
                }
                
                let latestIncomingChatMessage = state.latestIncomingChatMessage;
                if (isIncoming && !isViewingConversation) {
                    latestIncomingChatMessage = message;
                }

                return {
                    chatMessages: updatedMessages,
                    conversations: updatedConversations,
                    latestIncomingChatMessage
                };
            }),

            updateChatMessage: (messageId, updates) => set((state) => ({
                chatMessages: Array.isArray(state.chatMessages) ? state.chatMessages.map(msg =>
                    msg.id === messageId ? { ...msg, ...updates } : msg
                ) : []
            })),

            removeChatMessage: (messageId) => set((state) => ({
                chatMessages: Array.isArray(state.chatMessages) ? state.chatMessages.filter(msg => msg.id !== messageId) : []
            })),

            setAvailableUsers: (users) => set({ 
                availableUsers: Array.isArray(users) ? users : [] 
            }),

            updateUserStatus: (userId, isOnline) => {
                if (!userId) return; // Ignorar se userId não for fornecido
                
                set((state) => {
                    // Verificar se o status já está atualizado para evitar atualizações desnecessárias
                    const currentUser = Array.isArray(state.availableUsers) 
                        ? state.availableUsers.find(user => user.id === userId)
                        : null;
                    
                    // Verificar se há conversas que precisam ser atualizadas
                    const needsConversationUpdate = Array.isArray(state.conversations) && 
                        state.conversations.some(conv => 
                            conv.type === 'individual' && conv.id === userId && conv.isOnline !== isOnline
                        );
                    
                    // Se o status já está correto e não há conversas para atualizar, não fazer nada
                    if (currentUser && currentUser.isOnline === isOnline && !needsConversationUpdate) {
                        return state; // Retornar estado inalterado para evitar re-renders
                    }
                    
                    // Se o usuário não existe no availableUsers, não fazer nada (não criar novo array)
                    if (!currentUser && !needsConversationUpdate) {
                        return state;
                    }
                    
                    // Atualizar usuários se necessário
                    const updatedUsers = currentUser && currentUser.isOnline !== isOnline && Array.isArray(state.availableUsers)
                        ? state.availableUsers.map(user =>
                            user.id === userId ? { ...user, isOnline } : user
                        )
                        : state.availableUsers;
                    
                    // Atualizar conversas se necessário
                    const updatedConversations = needsConversationUpdate && Array.isArray(state.conversations)
                        ? state.conversations.map(conv =>
                            conv.type === 'individual' && conv.id === userId
                                ? { ...conv, isOnline }
                                : conv
                        )
                        : state.conversations;
                    
                    // Só retornar novo objeto se houver mudanças reais
                    if (updatedUsers === state.availableUsers && updatedConversations === state.conversations) {
                        return state;
                    }
                    
                    return {
                        availableUsers: updatedUsers,
                        conversations: updatedConversations
                    };
                });
            },

            setSystemMessages: (messages) => set({ systemMessages: messages }),

            addSystemMessage: (message) => set((state) => ({
                systemMessages: [message, ...state.systemMessages],
                unreadSystemCount: message.status === 'UNREAD'
                    ? state.unreadSystemCount + 1
                    : state.unreadSystemCount
            })),

            updateSystemMessage: (messageId, updates) => set((state) => ({
                systemMessages: state.systemMessages.map(msg =>
                    msg.id === messageId ? { ...msg, ...updates } : msg
                ),
                unreadSystemCount: updates.status === 'READ' && state.systemMessages.find(m => m.id === messageId)?.status === 'UNREAD'
                    ? Math.max(0, state.unreadSystemCount - 1)
                    : state.unreadSystemCount
            })),

            setLoading: (loading) => set({ loading }),
            setError: (error) => set({ error }),
            setSearchTerm: (term) => set({ searchTerm: term }),

            addTypingUser: (userId) => set((state) => ({
                typingUsers: new Set([...state.typingUsers, userId])
            })),

            removeTypingUser: (userId) => set((state) => {
                const newTypingUsers = new Set(state.typingUsers);
                newTypingUsers.delete(userId);
                return { typingUsers: newTypingUsers };
            }),

            setWsConnection: (connection) => set({ wsConnection: connection }),
            setIsConnected: (connected) => set({ isConnected: connected }),
            setIsFloatingChatOpen: (isOpen) =>
                set({
                    isFloatingChatOpen: isOpen,
                    ...(isOpen ? { latestIncomingChatMessage: null } : {}),
                }),
            setLatestIncomingChatMessage: (msg) => set({ latestIncomingChatMessage: msg }),
            dismissChatHeaderAlert: () => set({ latestIncomingChatMessage: null }),
            clearConversationUnread: (conversationId, conversationType) =>
                set((state) => ({
                    latestIncomingChatMessage: null,
                    conversations: (Array.isArray(state.conversations) ? state.conversations : []).map((conv) =>
                        conv.id === conversationId && conv.type === conversationType
                            ? { ...conv, unreadCount: 0 }
                            : conv
                    ),
                })),

            hydrateConversationsFromRecentMessages: (messages) => {
                const currentUser = get().getCurrentUser();
                if (!Array.isArray(messages) || messages.length === 0) return;

                const conversationMap = new Map<string, Conversation>();
                messages.forEach((msg) => {
                    const resolved = resolveConversationFromMessage(msg, currentUser?.id);
                    if (!resolved) return;

                    const { conversationId, conversationType, conversationName } = resolved;
                    if (!conversationName || conversationName === 'Conversa sem nome') return;

                    const key = `${conversationType}-${conversationId}`;
                    const messageCreatedAt = msg.createdAt ? new Date(msg.createdAt).getTime() : 0;
                    const existing = conversationMap.get(key);
                    const existingCreatedAt = existing?.lastMessage?.createdAt
                        ? new Date(existing.lastMessage.createdAt).getTime()
                        : 0;
                    const unreadIncrement =
                        msg.recipient?.id === currentUser?.id && !msg.isRead ? 1 : 0;

                    if (!existing) {
                        conversationMap.set(key, {
                            id: conversationId,
                            name: conversationName,
                            type: conversationType,
                            lastMessage: msg,
                            unreadCount: unreadIncrement,
                            isOnline: conversationType === 'individual' ? Boolean(msg.sender?.isOnline) : false,
                        });
                    } else {
                        conversationMap.set(key, {
                            ...existing,
                            unreadCount: (existing.unreadCount || 0) + unreadIncrement,
                            lastMessage:
                                messageCreatedAt > existingCreatedAt ? msg : existing.lastMessage,
                        });
                    }
                });

                const built = Array.from(conversationMap.values()).sort((a, b) => {
                    const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
                    const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
                    return bTime - aTime;
                });

                if (built.length > 0) {
                    get().setConversations(built);
                }
            },

            // Computed getters
            getUnreadChatCount: () => {
                const state = get();
                const conversations = Array.isArray(state.conversations) ? state.conversations : [];
                return conversations.reduce((total, conv) => total + (conv?.unreadCount || 0), 0);
            },

            getFilteredConversations: () => {
                const state = get();
                const conversations = Array.isArray(state.conversations) ? state.conversations : [];
                if (!state.searchTerm) return conversations;

                return conversations.filter(conv =>
                    conv && conv.name && typeof conv.name === 'string' && conv.name.toLowerCase().includes(state.searchTerm.toLowerCase())
                );
            },

            getCurrentUser: () => {
                const userStr = localStorage.getItem('user');
                return userStr ? JSON.parse(userStr) : null;
            }
        }),
        {
            name: 'message-store',
            enabled: false // Desabilitado para evitar TypeError: Cannot read properties of undefined (reading 'payload') causado por extensões do navegador
        }
    )
);