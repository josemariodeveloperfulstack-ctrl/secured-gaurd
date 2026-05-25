import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { contractService, ContractExpiringAlert } from '@/services/contractService';
import { Calendar, Loader2, RefreshCw, AlertCircle, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ExpiringAlertsWidgetProps {
  onRenew?: (contractId: string, contractNumber?: string, value?: number) => void;
}

const URGENCY_STYLES: Record<string, { badge: string; border: string }> = {
  CRITICAL: { badge: 'bg-red-500/25 text-red-300', border: 'border-red-500/40' },
  WARNING: { badge: 'bg-amber-500/25 text-amber-300', border: 'border-amber-500/40' },
  INFO: { badge: 'bg-blue-500/25 text-blue-300', border: 'border-blue-500/40' },
  DEFAULT: { badge: 'bg-gray-500/25 text-gray-300', border: 'border-gray-600' },
};

export const ExpiringAlertsWidget: React.FC<ExpiringAlertsWidgetProps> = ({ onRenew }) => {
  const [alerts, setAlerts] = useState<ContractExpiringAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await contractService.getExpiringAlerts();
      setAlerts(data);
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

  const getUrgency = (level: string) => URGENCY_STYLES[level] ?? URGENCY_STYLES.DEFAULT;

  const getUrgencyLabel = (level: string) => {
    if (level === 'CRITICAL') return '≤ 30 dias';
    if (level === 'WARNING') return '31–60 dias';
    if (level === 'INFO') return '61–90 dias';
    return '91–120 dias';
  };

  const criticalCount = alerts.filter((a) => a.urgencyLevel === 'CRITICAL').length;

  return (
    <Card className="bg-seguranca-graphite border-gray-600/80 h-full flex flex-col min-w-0 overflow-hidden">
      <CardHeader className="pb-2 px-4 pt-4 space-y-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold text-seguranca-lightgray flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 flex-shrink-0">
                <AlertCircle className="h-4 w-4 text-red-400" />
              </span>
              <span className="leading-tight">Vencimentos próximos</span>
            </CardTitle>
            <p className="text-[11px] text-gray-500 mt-2 pl-10">
              Próximos 120 dias · {alerts.length} contrato(s)
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadAlerts}
            disabled={loading}
            className="h-8 w-8 text-gray-400 hover:text-seguranca-yellow flex-shrink-0"
            aria-label="Atualizar alertas"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
        {criticalCount > 0 && (
          <Badge className="mt-3 ml-10 w-fit bg-red-500/20 text-red-300 border-red-500/30 text-[10px]">
            {criticalCount} crítico(s) — ação imediata
          </Badge>
        )}
      </CardHeader>

      <CardContent className="px-4 pb-4 flex-1 flex flex-col min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-seguranca-yellow" />
            <p className="text-xs text-gray-500">Carregando alertas…</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-2">
            <Calendar className="h-8 w-8 text-gray-600 mb-2" />
            <p className="text-sm text-gray-400">Nenhum vencimento</p>
            <p className="text-xs text-gray-500 mt-1">nos próximos 120 dias</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto max-h-[320px] pr-1 custom-scrollbar flex-1">
            {alerts.slice(0, 12).map((a) => {
              const style = getUrgency(a.urgencyLevel);
              return (
                <div
                  key={a.contractId}
                  className={cn(
                    'group p-3 rounded-lg border bg-seguranca-black/60 transition-colors',
                    'hover:bg-seguranca-black hover:border-seguranca-yellow/30',
                    style.border
                  )}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-seguranca-lightgray text-sm truncate">
                        {a.contractNumber}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{a.clientName}</p>
                    </div>
                    <Badge className={cn('text-[10px] border-0 flex-shrink-0', style.badge)}>
                      {getUrgencyLabel(a.urgencyLevel)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-2.5 gap-2">
                    <div className="text-[11px] text-gray-500">
                      <span className="text-white font-medium tabular-nums">
                        {a.daysRemaining}
                      </span>{' '}
                      dias · {formatDate(a.endDate)}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] border-seguranca-yellow/40 text-seguranca-yellow hover:bg-seguranca-yellow hover:text-black opacity-90 group-hover:opacity-100"
                      onClick={() => {
                        if (onRenew) onRenew(a.contractId, a.contractNumber, a.value);
                        else navigate(`/contratos?edit=${a.contractId}`);
                      }}
                    >
                      Renovar
                      <ChevronRight className="h-3 w-3 ml-0.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {alerts.length > 12 && (
              <p className="text-center text-xs text-gray-500 py-2">
                + {alerts.length - 12} contratos na fila
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
