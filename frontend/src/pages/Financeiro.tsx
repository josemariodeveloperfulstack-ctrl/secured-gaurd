import React, { useState, useRef, useEffect } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, Eye, DollarSign, TrendingUp, TrendingDown, Calendar, Loader2, BarChart3, LayoutDashboard, Receipt, Layers, Activity, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ContasAPagarTab from '@/components/financeiro/ContasAPagarTab';
import ContasAReceberTab from '@/components/financeiro/ContasAReceberTab';
import FluxoCaixaTab from '@/components/financeiro/FluxoCaixaTab';
import PagamentosTab from '@/components/financeiro/PagamentosTab';
import RelatoriosTab from '@/components/financeiro/RelatoriosTab';
import CentroCustosTab from '@/components/financeiro/CentroCustosTab';
import FaturasTab from '@/components/financeiro/FaturasTab';
import MedicoesTab from '@/components/financeiro/MedicoesTab';

const FinanceiroSimple: React.FC = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Navegação do carrossel de abas (similar ao Operacional)
  const tabsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = () => {
    const el = tabsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    const el = tabsRef.current;
    if (!el) return;
    const delta = direction === 'left' ? -240 : 240;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  useEffect(() => {
    updateScrollButtons();
    const el = tabsRef.current;
    if (!el) return;
    const onScroll = () => updateScrollButtons();
    el.addEventListener('scroll', onScroll, { passive: true } as AddEventListenerOptions);
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      el.removeEventListener('scroll', onScroll as EventListener);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, []);

  // Dados mock para teste
  const mockTransactions = [
    {
      id: '1',
      description: 'Pagamento de fornecedor',
      amount: 1500,
      type: 'EXPENSE',
      status: 'PENDING',
      category: 'Operacional',
      date: new Date().toISOString()
    },
    {
      id: '2',
      description: 'Recebimento de cliente',
      amount: 3000,
      type: 'INCOME',
      status: 'CONFIRMED',
      category: 'Vendas',
      date: new Date().toISOString()
    }
  ];

  const mockInvoices = [
    {
      id: '1',
      invoiceNumber: 'FAT-001',
      clientName: 'Cliente Teste',
      description: 'Serviços prestados',
      amount: 2500,
      status: 'PENDENTE',
      dueDate: new Date().toISOString(),
      issueDate: new Date().toISOString()
    }
  ];

  const mockResumo = {
    totalRevenue: 5000,
    accountsReceivable: 2500,
    totalExpenses: 1500
  };

  return (
    <StandardLayout>
      <div className="container mx-auto p-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <div className="w-full flex items-center gap-2">
            {canScrollLeft && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => scrollTabs('left')}
                className="shrink-0 rounded-full border-gray-700 bg-seguranca-graphite/80 text-gray-300 hover:bg-seguranca-black/60"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1 overflow-hidden">
              <TabsList
                ref={tabsRef as unknown as React.RefObject<HTMLDivElement>}
                className="w-full bg-seguranca-graphite/80 backdrop-blur border border-gray-700 px-3 py-3 rounded-2xl shadow-inner flex flex-nowrap items-center justify-center gap-2 min-h-14 overflow-x-hidden overflow-y-hidden"
              >
            <TabsTrigger value="dashboard" className="inline-flex items-center gap-2 justify-center h-10 rounded-full text-xs sm:text-sm px-4 py-0 border border-transparent text-seguranca-lightgray hover:border-gray-600 hover:bg-seguranca-black/50 data-[state='active']:bg-seguranca-yellow data-[state='active']:text-seguranca-black data-[state='active']:shadow">
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="contas-pagar" className="inline-flex items-center gap-2 justify-center h-10 rounded-full text-xs sm:text-sm px-4 py-0 border border-transparent text-seguranca-lightgray hover:border-gray-600 hover:bg-seguranca-black/50 data-[state='active']:bg-seguranca-yellow data-[state='active']:text-seguranca-black data-[state='active']:shadow">
               <TrendingDown className="h-4 w-4" />
               <span>Contas a Pagar</span>
            </TabsTrigger>
            <TabsTrigger value="contas-receber" className="inline-flex items-center gap-2 justify-center h-10 rounded-full text-xs sm:text-sm px-4 py-0 border border-transparent text-seguranca-lightgray hover:border-gray-600 hover:bg-seguranca-black/50 data-[state='active']:bg-seguranca-yellow data-[state='active']:text-seguranca-black data-[state='active']:shadow">
               <TrendingUp className="h-4 w-4" />
               <span>Contas a Receber</span>
            </TabsTrigger>
            <TabsTrigger value="fluxo-caixa" className="inline-flex items-center gap-2 justify-center h-10 rounded-full text-xs sm:text-sm px-4 py-0 border border-transparent text-seguranca-lightgray hover:border-gray-600 hover:bg-seguranca-black/50 data-[state='active']:bg-seguranca-yellow data-[state='active']:text-seguranca-black data-[state='active']:shadow">
               <Activity className="h-4 w-4" />
               <span>Fluxo de Caixa</span>
            </TabsTrigger>
            <TabsTrigger value="pagamentos" className="inline-flex items-center gap-2 justify-center h-10 rounded-full text-xs sm:text-sm px-4 py-0 border border-transparent text-seguranca-lightgray hover:border-gray-600 hover:bg-seguranca-black/50 data-[state='active']:bg-seguranca-yellow data-[state='active']:text-seguranca-black data-[state='active']:shadow">
               <DollarSign className="h-4 w-4" />
               <span>Pagamentos</span>
            </TabsTrigger>
            <TabsTrigger value="relatorios-financeiros" className="inline-flex items-center gap-2 justify-center h-10 rounded-full text-xs sm:text-sm px-4 py-0 border border-transparent text-seguranca-lightgray hover:border-gray-600 hover:bg-seguranca-black/50 data-[state='active']:bg-seguranca-yellow data-[state='active']:text-seguranca-black data-[state='active']:shadow">
               <FileText className="h-4 w-4" />
               <span>Relatórios Financeiros</span>
            </TabsTrigger>
            <TabsTrigger value="centro-custos" className="inline-flex items-center gap-2 justify-center h-10 rounded-full text-xs sm:text-sm px-4 py-0 border border-transparent text-seguranca-lightgray hover:border-gray-600 hover:bg-seguranca-black/50 data-[state='active']:bg-seguranca-yellow data-[state='active']:text-seguranca-black data-[state='active']:shadow">
               <Layers className="h-4 w-4" />
               <span>Centro de Custos</span>
            </TabsTrigger>
            <TabsTrigger value="faturas" className="inline-flex items-center gap-2 justify-center h-10 rounded-full text-xs sm:text-sm px-4 py-0 border border-transparent text-seguranca-lightgray hover:border-gray-600 hover:bg-seguranca-black/50 data-[state='active']:bg-seguranca-yellow data-[state='active']:text-seguranca-black data-[state='active']:shadow">
               <Receipt className="h-4 w-4" />
               <span>Faturas</span>
            </TabsTrigger>
            <TabsTrigger value="medicoes" className="inline-flex items-center gap-2 justify-center h-10 rounded-full text-xs sm:text-sm px-4 py-0 border border-transparent text-seguranca-lightgray hover:border-gray-600 hover:bg-seguranca-black/50 data-[state='active']:bg-seguranca-yellow data-[state='active']:text-seguranca-black data-[state='active']:shadow">
               <BarChart3 className="h-4 w-4" />
               <span>Medições</span>
            </TabsTrigger>
              </TabsList>
            </div>
            {canScrollRight && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => scrollTabs('right')}
                className="shrink-0 rounded-full border-gray-700 bg-seguranca-graphite/80 text-gray-300 hover:bg-seguranca-black/60"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          <TabsContent value="dashboard">
            {/* Cards de Resumo Financeiro */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-seguranca-black border-gray-600 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Receita Total</p>
                    <p className="text-2xl font-bold text-green-500">
                      R$ {mockResumo.totalRevenue.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </Card>
              <Card className="bg-seguranca-black border-gray-600 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Contas a Receber</p>
                    <p className="text-2xl font-bold text-blue-500">
                      R$ {mockResumo.accountsReceivable.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-500" />
                </div>
              </Card>
              <Card className="bg-seguranca-black border-gray-600 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Despesas</p>
                    <p className="text-2xl font-bold text-red-500">
                      R$ {mockResumo.totalExpenses.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-500" />
                </div>
              </Card>
              <Card className="bg-seguranca-black border-gray-600 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Lucro Líquido</p>
                    <p className="text-2xl font-bold text-purple-500">
                      R$ {(mockResumo.totalRevenue - mockResumo.totalExpenses).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-500" />
                </div>
              </Card>
            </div>

            {/* Placeholder para gráficos */}
            <Card className="bg-seguranca-graphite border-gray-600 p-6">
              <div className="text-center py-8">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                <p className="text-gray-400">Dashboard financeiro funcionando!</p>
                <p className="text-sm text-gray-500 mt-2">Gráficos serão implementados aqui</p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="contas-pagar">
            <ContasAPagarTab />
          </TabsContent>

          <TabsContent value="contas-receber">
            <ContasAReceberTab />
          </TabsContent>

          <TabsContent value="fluxo-caixa">
            <FluxoCaixaTab />
          </TabsContent>

          <TabsContent value="pagamentos">
            <PagamentosTab />
          </TabsContent>

          <TabsContent value="relatorios-financeiros">
            <RelatoriosTab />
          </TabsContent>

          <TabsContent value="centro-custos">
            <CentroCustosTab />
          </TabsContent>

          <TabsContent value="faturas">
            <FaturasTab />
          </TabsContent>

          <TabsContent value="medicoes">
            <MedicoesTab />
          </TabsContent>
        </Tabs>
      </div>
    </StandardLayout>
  );
};

const Financeiro = FinanceiroSimple;
export default Financeiro;