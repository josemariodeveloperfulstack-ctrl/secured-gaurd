import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';

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
    useWebSocket({
        token: token || '',
        username: username,
        onConnect: () => {
            console.log('🌐 [WebSocketGlobal] Conectado com sucesso');
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
