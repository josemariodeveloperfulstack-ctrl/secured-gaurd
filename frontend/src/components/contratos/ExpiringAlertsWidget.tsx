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
    const baseClass = "text-[10px] sm:text-xs px-1.5 py-0";
    if (level === 'CRITICAL') return <Badge className={`bg-red-500/20 text-red-400 ${baseClass}`}>≤30 dias</Badge>;
    if (level === 'WARNING') return <Badge className={`bg-yellow-500/20 text-yellow-400 ${baseClass}`}>31-60 dias</Badge>;
    if (level === 'INFO') return <Badge className={`bg-blue-500/20 text-blue-400 ${baseClass}`}>61-90 dias</Badge>;
    return <Badge variant="secondary" className={baseClass}>91-120 dias</Badge>;
  };

  return (
    <Card className="bg-seguranca-graphite border-gray-600 min-w-0 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4">
        <CardTitle className="text-xs sm:text-sm font-medium text-seguranca-lightgray flex items-center gap-2 truncate min-w-0">
          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-seguranca-yellow flex-shrink-0" />
          <span className="truncate">Contratos a vencer (120 dias)</span>
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={loadAlerts} disabled={loading} className="flex-shrink-0 h-8 w-8 p-0">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-seguranca-yellow" />
          </div>
        ) : alerts.length === 0 ? (
          <p className="text-gray-400 text-xs sm:text-sm py-4">Nenhum contrato a vencer nos próximos 120 dias.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {alerts.slice(0, 10).map((a) => (
              <div
                key={a.contractId}
                className="p-2 sm:p-2.5 bg-seguranca-black border border-gray-600 rounded-lg flex justify-between items-center gap-2 min-w-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-seguranca-lightgray truncate text-xs sm:text-sm">{a.contractNumber}</p>
                  <p className="text-[10px] sm:text-xs text-gray-400 truncate">{a.clientName}</p>
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                    {getUrgencyBadge(a.urgencyLevel)}
                    <span className="text-[10px] sm:text-xs text-gray-500">{a.daysRemaining} dias</span>
                    <span className="text-[10px] sm:text-xs text-gray-500">{formatDate(a.endDate)}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[10px] sm:text-xs flex-shrink-0 px-2 sm:px-3"
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
              <p className="text-xs text-gray-500 text-center">+ {alerts.length - 10} mais</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
