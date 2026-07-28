import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, User, MessageSquare, GitBranch, PlusCircle, RefreshCw } from 'lucide-react';
import { fetchInteractionHistoryByLead } from '@/services/crmService';

interface HistoryEntry {
  id: string;
  leadId: string;
  userId: string;
  userName: string;
  action: string;
  note: string;
  createdAt: string;
}

interface LeadHistoryProps {
  leadId: string;
}

const actionConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  CREATED: { label: 'Criado', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: <PlusCircle className="h-3.5 w-3.5" /> },
  UPDATED: { label: 'Atualizado', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <RefreshCw className="h-3.5 w-3.5" /> },
  STATUS_CHANGED: { label: 'Status Alterado', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: <GitBranch className="h-3.5 w-3.5" /> },
  OPPORTUNITY_CREATED: { label: 'Oportunidade', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: <PlusCircle className="h-3.5 w-3.5" /> },
  NOTE_ADDED: { label: 'Observação', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: <MessageSquare className="h-3.5 w-3.5" /> },
};

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

export default function LeadHistory({ leadId }: LeadHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leadId) return;
    setLoading(true);
    fetchInteractionHistoryByLead(leadId)
      .then((data) => setHistory(data || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [leadId]);

  if (loading) {
    return (
      <div className="text-center py-6 text-gray-400 text-sm">
        Carregando histórico...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 text-sm">
        Nenhum registro de histórico encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((entry) => {
        const config = actionConfig[entry.action] || { label: entry.action, color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: <MessageSquare className="h-3.5 w-3.5" /> };
        return (
          <div key={entry.id} className="flex gap-3 p-3 rounded-lg bg-seguranca-black/40 border border-gray-700/50">
            <div className="flex-shrink-0 mt-0.5">
              <div className={`p-1.5 rounded-full ${config.color} border`}>
                {config.icon}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-xs font-medium ${config.color}`}>
                  {config.label}
                </Badge>
                {entry.userName && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {entry.userName}
                  </span>
                )}
                <span className="text-xs text-gray-500 flex items-center gap-1 ml-auto">
                  <Clock className="h-3 w-3" />
                  {formatDateTime(entry.createdAt)}
                </span>
              </div>
              {entry.note && (
                <p className="text-sm text-gray-300 mt-1.5">{entry.note}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
