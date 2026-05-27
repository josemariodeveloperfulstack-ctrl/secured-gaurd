import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';
import { Bot, Loader2, MessageCircle, Send, User } from 'lucide-react';

type ConversationMode = 'AI_ACTIVE' | 'HUMAN_HANDOFF';

interface Conversation {
  id: string;
  phoneNumber: string;
  leadName?: string;
  contactName?: string;
  mode: ConversationMode;
  assignedUserName?: string;
  lastMessagePreview?: string;
  lastMessageAt?: string;
  messageCount: number;
}

interface Message {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  senderType: 'LEAD' | 'AI' | 'HUMAN' | 'SYSTEM';
  body?: string;
  senderUserName?: string;
  createdAt: string;
}

export const WhatsAppInboxPanel: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const selected = conversations.find((c) => c.id === selectedId);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/whatsapp/agent/conversations', {
        params: { page: 0, size: 50, sort: 'lastMessageAt,desc' },
      });
      const content = res.data?.content ?? res.data ?? [];
      setConversations(content);
      if (!selectedId && content.length > 0) {
        setSelectedId(content[0].id);
      }
    } catch (e) {
      console.error(e);
      toast({
        title: 'Erro ao carregar conversas',
        description: 'Verifique permissões comerciais e conexão com a API.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedId, toast]);

  const loadMessages = useCallback(async (id: string) => {
    try {
      setLoadingMessages(true);
      const res = await api.get(`/whatsapp/agent/conversations/${id}/messages`);
      setMessages(res.data ?? []);
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao carregar mensagens', variant: 'destructive' });
    } finally {
      setLoadingMessages(false);
    }
  }, [toast]);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 15000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  useEffect(() => {
    if (selectedId) {
      loadMessages(selectedId);
      const interval = setInterval(() => loadMessages(selectedId), 8000);
      return () => clearInterval(interval);
    }
  }, [selectedId, loadMessages]);

  const takeover = async () => {
    if (!selectedId) return;
    await api.post(`/whatsapp/agent/conversations/${selectedId}/takeover`);
    await loadConversations();
    toast({ title: 'Você assumiu o atendimento', description: 'A IA está em pausa nesta conversa.' });
  };

  const releaseAi = async () => {
    if (!selectedId) return;
    await api.post(`/whatsapp/agent/conversations/${selectedId}/release-ai`);
    await loadConversations();
    toast({ title: 'IA reativada', description: 'A assistente voltará a responder automaticamente.' });
  };

  const sendMessage = async () => {
    if (!selectedId || !draft.trim()) return;
    try {
      setSending(true);
      await api.post(`/whatsapp/agent/conversations/${selectedId}/messages`, {
        body: draft.trim(),
      });
      setDraft('');
      await loadMessages(selectedId);
      await loadConversations();
    } catch (e) {
      console.error(e);
      toast({
        title: 'Falha ao enviar',
        description: 'Confirme se o WhatsApp está conectado.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const senderLabel = (m: Message) => {
    if (m.senderType === 'LEAD') return 'Cliente';
    if (m.senderType === 'AI') return 'IA';
    if (m.senderType === 'HUMAN') return m.senderUserName || 'Consultor';
    return 'Sistema';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[520px]">
      <Card className="lg:col-span-1 border-slate-700/50 bg-slate-900/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-emerald-400" />
            Conversas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-[460px]">
              {conversations.length === 0 && (
                <p className="text-sm text-muted-foreground px-4 py-6">
                  Nenhuma conversa ainda. Mensagens recebidas via webhook aparecerão aqui.
                </p>
              )}
              {conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-800/80 hover:bg-slate-800/50 transition ${
                    selectedId === c.id ? 'bg-slate-800/70' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">
                      {c.leadName || c.contactName || c.phoneNumber}
                    </span>
                    <Badge variant={c.mode === 'AI_ACTIVE' ? 'secondary' : 'default'} className="text-[10px] shrink-0">
                      {c.mode === 'AI_ACTIVE' ? 'IA' : 'Humano'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {c.lastMessagePreview || c.phoneNumber}
                  </p>
                </button>
              ))}
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 border-slate-700/50 bg-slate-900/40 flex flex-col">
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              {selected
                ? selected.leadName || selected.contactName || selected.phoneNumber
                : 'Selecione uma conversa'}
            </CardTitle>
            {selected && (
              <p className="text-xs text-muted-foreground mt-1">{selected.phoneNumber}</p>
            )}
          </div>
          {selected && (
            <div className="flex gap-2 flex-wrap">
              {selected.mode === 'AI_ACTIVE' ? (
                <Button size="sm" variant="outline" onClick={takeover}>
                  <User className="h-3 w-3 mr-1" />
                  Assumir
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={releaseAi}>
                  <Bot className="h-3 w-3 mr-1" />
                  Voltar IA
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 pt-0">
          <ScrollArea className="flex-1 h-[360px] rounded-md border border-slate-800/80 p-3">
            {loadingMessages ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((m) => {
                  const outbound = m.direction === 'OUTBOUND';
                  return (
                    <div
                      key={m.id}
                      className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                          outbound
                            ? 'bg-emerald-700/30 text-emerald-50'
                            : 'bg-slate-800 text-slate-100'
                        }`}
                      >
                        <p className="text-[10px] opacity-70 mb-1">{senderLabel(m)}</p>
                        <p className="whitespace-pre-wrap">{m.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          {selected && (
            <div className="flex gap-2 mt-3">
              <Input
                placeholder={
                  selected.mode === 'HUMAN_HANDOFF'
                    ? 'Mensagem como consultor...'
                    : 'Assuma o atendimento para enviar mensagens'
                }
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={selected.mode === 'AI_ACTIVE'}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              />
              <Button
                onClick={sendMessage}
                disabled={sending || selected.mode === 'AI_ACTIVE' || !draft.trim()}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
