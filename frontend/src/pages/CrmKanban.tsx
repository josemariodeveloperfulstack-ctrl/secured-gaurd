import React, { useState, useEffect } from 'react';
import KanbanBoard from '../components/comercial/KanbanBoard';
import CrmDashboard from '../components/comercial/CrmDashboard';
import CommercialDashboard from '../components/comercial/CommercialDashboard';
import TeamDashboard from '../components/comercial/TeamDashboard';
import SalesGoalManager from '../components/comercial/SalesGoalManager';
import { StandardLayout } from '@/components/StandardLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { fetchCrmMetrics } from '@/services/crmService';
import { 
  Trello, 
  BarChart3, 
  Target, 
  TrendingUp, 
  Users, 
  DollarSign,
  Loader2,
  LineChart as LineChartIcon,
  Trophy,
  Crosshair
} from 'lucide-react';

export default function CrmKanban() {
  const [activeTab, setActiveTab] = useState('kanban');
  const { user } = useAuth();
  const { toast } = useToast();

  const isGestorOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'GESTOR' || user?.role === 'COMERCIAL';
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const data = await fetchCrmMetrics();
      setMetrics(data);
    } catch (error: any) {
      console.error('Erro ao carregar métricas do CRM:', error);
      const serverMsg = error?.response?.data?.message;
      toast({
        title: "Erro",
        description: serverMsg || "Não foi possível carregar as métricas do CRM.",
        variant: "destructive"
      });
      // Usar valores padrão em caso de erro
      setMetrics({
        totalLeads: 0,
        activeOpportunities: 0,
        conversionRate: 0,
        estimatedRevenue: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 'R$ 0,00';
    if (numValue >= 1000000) {
      return `R$ ${(numValue / 1000000).toFixed(1)}M`;
    } else if (numValue >= 1000) {
      return `R$ ${(numValue / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  return (
    <StandardLayout title="CRM Comercial">
      <div className="space-y-6 w-full min-w-0">
        {/* Header com estatísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-seguranca-graphite border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total de Leads</p>
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-seguranca-yellow mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-seguranca-yellow">
                      {metrics?.totalLeads || 0}
                    </p>
                  )}
                </div>
                <Users className="h-8 w-8 text-seguranca-yellow" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-seguranca-graphite border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Oportunidades Ativas</p>
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-seguranca-yellow mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-seguranca-yellow">
                      {metrics?.activeOpportunities || 0}
                    </p>
                  )}
                </div>
                <Target className="h-8 w-8 text-seguranca-yellow" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-seguranca-graphite border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Taxa de Conversão</p>
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-seguranca-yellow mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-seguranca-yellow">
                      {metrics?.conversionRate || 0}%
                    </p>
                  )}
                </div>
                <TrendingUp className="h-8 w-8 text-seguranca-yellow" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-seguranca-graphite border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Receita Prevista</p>
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-seguranca-yellow mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-seguranca-yellow">
                      {formatCurrency(metrics?.estimatedRevenue || metrics?.totalValue || 0)}
                    </p>
                  )}
                </div>
                <DollarSign className="h-8 w-8 text-seguranca-yellow" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full min-w-0">
          <TabsList className={`grid w-full bg-seguranca-graphite border border-gray-600 ${isGestorOrAdmin ? 'grid-cols-5' : 'grid-cols-3'}`}>
            <TabsTrigger 
              value="kanban" 
              className="data-[state='active']:bg-seguranca-yellow data-[state='active']:text-black text-seguranca-lightgray"
            >
              <Trello className="h-4 w-4 mr-2" />
              Kanban
            </TabsTrigger>
            <TabsTrigger 
              value="dashboard" 
              className="data-[state='active']:bg-seguranca-yellow data-[state='active']:text-black text-seguranca-lightgray"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="desempenho" 
              className="data-[state='active']:bg-seguranca-yellow data-[state='active']:text-black text-seguranca-lightgray"
            >
              <LineChartIcon className="h-4 w-4 mr-2" />
              Desempenho
            </TabsTrigger>
            {isGestorOrAdmin && (
              <TabsTrigger 
                value="equipe" 
                className="data-[state='active']:bg-seguranca-yellow data-[state='active']:text-black text-seguranca-lightgray"
              >
                <Trophy className="h-4 w-4 mr-2" />
                Equipe
              </TabsTrigger>
            )}
            {isGestorOrAdmin && (
              <TabsTrigger 
                value="metas" 
                className="data-[state='active']:bg-seguranca-yellow data-[state='active']:text-black text-seguranca-lightgray"
              >
                <Crosshair className="h-4 w-4 mr-2" />
                Metas
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="kanban" className="space-y-4 w-full min-w-0">
            <KanbanBoard />
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-4">
            <CrmDashboard />
          </TabsContent>

          <TabsContent value="desempenho" className="space-y-4">
            <CommercialDashboard />
          </TabsContent>

          {isGestorOrAdmin && (
            <TabsContent value="equipe" className="space-y-4">
              <TeamDashboard />
            </TabsContent>
          )}

          {isGestorOrAdmin && (
            <TabsContent value="metas" className="space-y-4">
              <SalesGoalManager />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </StandardLayout>
  );
} 