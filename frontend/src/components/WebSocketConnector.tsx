import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { messageService } from '@/services/messageService';
import { ChatMessage, useMessageStore } from '@/stores/messageStore';

/**
 * Componente global que mantém a conexão WebSocket ativa em toda a aplicação.
 * Não renderiza nenhum elemento visual.
 */
const WebSocketConnector: React.FC = () => {
    const { user } = useAuth();
    const token = localStorage.getItem('token');

    // Identificar o usuário para o cabeçalho X-Username
    const username = user?.username || user?.email || user?.id || '';

    // Inicializar o hook com a configuração global
    // Como o useWebSocket agora é um singleton, chamar aqui garante 
    // que a conexão física comece assim que o App for montado (se houver token).
    const hydrateConversationsFromRecentMessages = useMessageStore(
        (s) => s.hydrateConversationsFromRecentMessages
    );

    useEffect(() => {
        if (!user?.id) return;
        let cancelled = false;
        messageService.getRecentConversations().then((messages) => {
            if (!cancelled && Array.isArray(messages) && messages.length > 0) {
                hydrateConversationsFromRecentMessages(messages as ChatMessage[]);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [user?.id, hydrateConversationsFromRecentMessages]);

    useWebSocket({
        token: token || '',
        username: username,
        onConnect: () => {
            console.log('🌐 [WebSocketGlobal] Conectado com sucesso');
            messageService.getRecentConversations().then((messages) => {
                if (Array.isArray(messages) && messages.length > 0) {
                    hydrateConversationsFromRecentMessages(messages as ChatMessage[]);
                }
            });
        },
        onDisconnect: () => {
            console.log('🌐 [WebSocketGlobal] Desconectado');
        },
        onError: (err) => {
            console.error('🌐 [WebSocketGlobal] Erro:', err);
        }
    });

    // Este componente não tem representação visual
    return null;
};

export default WebSocketConnector;
