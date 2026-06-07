import { useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import { resolveStompBrokerUrl } from '@/lib/stompBroker';
import { useMessageStore } from '../stores/messageStore';
import { ChatMessage } from '../stores/messageStore';

interface WebSocketConfig {
  token: string;
  username: string;
  onMessage?: (message: ChatMessage) => void;
  onTyping?: (typing: { userId: string; isTyping: boolean }) => void;
  onUserStatus?: (event: { userId: string; isOnline: boolean; timestamp?: number }) => void;
  onError?: (error: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

/** Jackson pode serializar como "online" ou "isOnline" — normaliza aqui. */
function normalizeUserStatusEvent(raw: Record<string, unknown>): {
  userId: string;
  isOnline: boolean;
  timestamp?: number;
} {
  const userId = String(raw.userId ?? '');
  const isOnline = Boolean(raw.isOnline ?? raw.online);
  const timestamp = typeof raw.timestamp === 'number' ? raw.timestamp : undefined;
  return { userId, isOnline, timestamp };
}

// Singleton state for the physical connection
let sharedClient: Client | null = null;
let sharedSubscribers: Set<WebSocketConfig> = new Set();
let isConnecting = false;

export const useWebSocket = (config: WebSocketConfig) => {
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 8;
  const reconnectDelay = 5000;

  const {
    setWsConnection,
    setIsConnected,
    addChatMessage,
    addTypingUser,
    removeTypingUser,
    setError
  } = useMessageStore();

  const notifySubscribers = useCallback((event: string, data: any) => {
    sharedSubscribers.forEach(sub => {
      switch (event) {
        case 'onConnect': sub.onConnect?.(); break;
        case 'onDisconnect': sub.onDisconnect?.(); break;
        case 'onMessage': sub.onMessage?.(data); break;
        case 'onTyping': sub.onTyping?.(data); break;
        case 'onUserStatus': sub.onUserStatus?.(data); break;
        case 'onError': sub.onError?.(data); break;
      }
    });
  }, []);

  const connect = useCallback(() => {
    if (sharedClient?.connected) {
      console.log('[WebSocket] Já conectado (Shared)');
      return;
    }

    if (isConnecting) {
      console.log('[WebSocket] Conexão já em andamento...');
      return;
    }

    isConnecting = true;
    console.log('[WebSocket] Iniciando conexão única...');

    try {
      const client = new Client({
        brokerURL: resolveStompBrokerUrl(),
        connectHeaders: {
          'Authorization': `Bearer ${config.token}`,
          'X-Username': config.username
        },
        debug: (str) => {
          if (str.includes('ERROR') || str.includes('CONNECTED') || str.includes('DISCONNECTED')) {
            console.log('[WebSocket Debug]', str);
          }
        },
        // Desliga reconnect automático do STOMP (infinito); usamos scheduleReconnect com limite.
        reconnectDelay: 0,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
      });

      client.onConnect = (frame) => {
        console.log('[WebSocket] Conectado (Shared):', frame);
        reconnectAttemptsRef.current = 0;
        isConnecting = false;
        setIsConnected(true);
        setError(null);

        notifySubscribers('onConnect', frame);

        // Subscrever aos tópicos globais uma única vez
        client.subscribe(`/user/${config.username}/queue/messages`, (message) => {
          try {
            const chatMessage: ChatMessage = JSON.parse(message.body);
            addChatMessage(chatMessage);
            notifySubscribers('onMessage', chatMessage);
          } catch (error) {
            console.error('[WebSocket] Erro ao processar mensagem:', error);
          }
        });

        client.subscribe('/topic/chat/group/*', (message) => {
          try {
            const chatMessage: ChatMessage = JSON.parse(message.body);
            addChatMessage(chatMessage);
            notifySubscribers('onMessage', chatMessage);
          } catch (error) {
            console.error('[WebSocket] Erro ao processar mensagem de grupo:', error);
          }
        });

        client.subscribe(`/user/${config.username}/queue/typing`, (message) => {
          try {
            const typingEvent = JSON.parse(message.body);
            if (typingEvent.isTyping) {
              addTypingUser(typingEvent.userId);
              setTimeout(() => removeTypingUser(typingEvent.userId), 3000);
            } else {
              removeTypingUser(typingEvent.userId);
            }
            notifySubscribers('onTyping', typingEvent);
          } catch (error) {
            console.error('[WebSocket] Erro ao processar evento de digitação:', error);
          }
        });

        client.subscribe(`/user/${config.username}/queue/user-status`, (message) => {
          try {
            const event = normalizeUserStatusEvent(JSON.parse(message.body));
            const { updateUserStatus } = useMessageStore.getState();
            if (updateUserStatus && event.userId) {
              updateUserStatus(event.userId, event.isOnline);
            }
            notifySubscribers('onUserStatus', event);
          } catch (error) {
            console.error('[WebSocket] Erro ao processar status:', error);
          }
        });

        client.subscribe('/topic/user-status', (message) => {
          try {
            const event = normalizeUserStatusEvent(JSON.parse(message.body));
            const { updateUserStatus } = useMessageStore.getState();
            if (updateUserStatus && event.userId) {
              updateUserStatus(event.userId, event.isOnline);
            }
            notifySubscribers('onUserStatus', event);
          } catch (error) {
            console.error('[WebSocket] Erro ao processar broadcast status:', error);
          }
        });
      };

      client.onStompError = (frame) => {
        console.error('[WebSocket] Erro STOMP:', frame);
        isConnecting = false;
        setIsConnected(false);
        setError('Erro de conexão WebSocket');
        notifySubscribers('onError', frame);
        scheduleReconnect();
      };

      client.onWebSocketClose = (event) => {
        console.log('[WebSocket] Conexão fechada:', event);
        isConnecting = false;
        setIsConnected(false);
        notifySubscribers('onDisconnect', event);
        if (event.code !== 1000) scheduleReconnect();
      };

      sharedClient = client;
      client.activate();

    } catch (error) {
      isConnecting = false;
      console.error('[WebSocket] Erro ao criar conexão:', error);
      setError('Erro ao conectar WebSocket');
      notifySubscribers('onError', error);
      scheduleReconnect();
    }
  }, [config.token, config.username, setIsConnected, setError, addChatMessage, addTypingUser, removeTypingUser, notifySubscribers]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) return;
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);

    const delay = reconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++;
      connect();
    }, delay);
  }, [connect]);

  const disconnect = useCallback(() => {
    if (sharedSubscribers.size > 0) {
      console.log('[WebSocket] Mantendo conexão compartilhada (há outros inscritos)');
      return;
    }

    console.log('[WebSocket] Desconectando conexão física...');
    if (sharedClient) {
      sharedClient.deactivate();
      sharedClient = null;
    }
    isConnecting = false;
    setIsConnected(false);
    setWsConnection(null);
  }, [setIsConnected, setWsConnection]);

  const sendMessage = useCallback((destination: string, body: any) => {
    if (!sharedClient?.connected) return false;
    try {
      sharedClient.publish({ destination, body: JSON.stringify(body) });
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  const sendTypingEvent = useCallback((conversationId: string, recipientId?: string, groupId?: string, departmentId?: string) => {
    return sendMessage('/app/chat/typing', {
      conversationId,
      userId: config.username,
      userName: config.username,
      recipientId,
      groupId,
      departmentId,
      isTyping: true
    });
  }, [sendMessage, config.username]);

  // Gestão de inscritos
  useEffect(() => {
    sharedSubscribers.add(config);
    return () => {
      sharedSubscribers.delete(config);
    };
  }, [config]);

  // Conectar/Desconectar automático
  useEffect(() => {
    if (config.token && config.username && config.token !== 'null') {
      connect();
    }
    return () => {
      // Opcional: desconectar se for o último? 
      // Para o modo global, preferimos manter vivo enquanto houver componentes usando.
    };
  }, [config.token, config.username, connect]);

  // Atualizar store global
  useEffect(() => {
    if (sharedClient) {
      setWsConnection({
        client: sharedClient,
        sendEvent: sendMessage,
        sendTyping: sendTypingEvent,
        isConnected: sharedClient.connected
      });
    }
  }, [setWsConnection, sendMessage, sendTypingEvent]);

  return {
    isConnected: sharedClient?.connected || false,
    connect,
    disconnect,
    sendMessage,
    sendTypingEvent
  };
};
