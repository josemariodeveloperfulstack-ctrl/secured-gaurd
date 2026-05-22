import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { contractService, ContractExpiringAlert } from '@/services/contractService';
import { Calendar, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface ExpiringAlertsWidgetProps {
  onRenew?: (contractId: string, contractNumber?: string, value?: number) => void;
}

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

  const formatCurrency = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

  const getUrgencyBadge = (level: string) => {
    const baseClass = "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-none border-2";
    if (level === 'CRITICAL') return <span className={`border-red-500/50 text-red-500 bg-red-500/10 ${baseClass}`}>&lt;=30_DIAS</span>;
    if (level === 'WARNING') return <span className={`border-yellow-500/50 text-yellow-500 bg-yellow-500/10 ${baseClass}`}>31-60_DIAS</span>;
    if (level === 'INFO') return <span className={`border-orange-500/50 text-orange-500 bg-orange-500/10 ${baseClass}`}>61-90_DIAS</span>;
    return <span className={`border-zinc-700 text-zinc-400 bg-zinc-800/30 ${baseClass}`}>91-120_DIAS</span>;
  };

  return (
    <Card className="bg-[#121212] border-2 border-zinc-800 rounded-none min-w-0 overflow-hidden font-mono hover:border-red-500/30 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4 border-b border-zinc-800">
        <CardTitle className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-red-500 flex items-center gap-2 truncate min-w-0">
          <Calendar className="h-4 w-4 text-red-500 flex-shrink-0" />
          <span className="truncate">SYS::ALERTA_VENCIMENTO_120D</span>
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={loadAlerts} disabled={loading} className="flex-shrink-0 h-7 w-7 p-0 border border-zinc-800 hover:bg-zinc-800 hover:text-white rounded-none">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-red-500" />
          </div>
        ) : alerts.length === 0 ? (
          <p className="text-zinc-500 text-xs py-4 uppercase font-bold tracking-wider">Nenhum contrato a vencer em 120 dias.</p>
        ) : (
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {alerts.slice(0, 10).map((a) => (
              <div
                key={a.contractId}
                className="p-3 bg-black border-2 border-zinc-800 rounded-none flex justify-between items-center gap-3 min-w-0 hover:border-red-500/40 transition-colors"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-bold text-white truncate text-xs">{a.contractNumber}</p>
                  <p className="text-[10px] text-zinc-500 truncate font-sans uppercase font-bold">{a.clientName}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {getUrgencyBadge(a.urgencyLevel)}
                    <span className="text-[10px] text-zinc-400 font-bold bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded-none">{a.daysRemaining} DIAS</span>
                    <span className="text-[10px] text-zinc-500 font-bold">{formatDate(a.endDate)}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[10px] flex-shrink-0 border-2 border-yellow-500 text-yellow-500 bg-transparent hover:bg-yellow-500 hover:text-black rounded-none h-7 px-2 font-bold uppercase tracking-wider transition-all active:scale-[0.97]"
                  onClick={() => {
                    if (onRenew) onRenew(a.contractId, a.contractNumber, a.value);
                    else navigate(`/contratos?edit=${a.contractId}`);
                  }}
                >
                  Renovar
                </Button>
              </div>
            ))}
            {alerts.length > 10 && (
              <p className="text-[10px] text-zinc-500 text-center uppercase tracking-wider font-bold">+ {alerts.length - 10} mais em fila</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
