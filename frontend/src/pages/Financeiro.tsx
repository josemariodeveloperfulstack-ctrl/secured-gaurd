import React, { useState } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { UserPermissions } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, Eye, DollarSign, TrendingUp, TrendingDown, Calendar, Loader2, BarChart3, LayoutDashboard, Receipt, Layers, Activity, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FinanceiroDashboard } from '@/components/financeiro/FinanceiroDashboard';
import ContasAPagar from '@/components/financeiro/ContasAPagar';
import ContasAReceber from '@/components/financeiro/ContasAReceber';
import PagamentosTab from '@/components/financeiro/PagamentosTab';
import CentroCustosTab from '@/components/financeiro/CentroCustosTab';
import FaturasTab from '@/components/financeiro/FaturasTab';
import MedicoesTab from '@/components/financeiro/MedicoesTab';

const FinanceiroSimple: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Função para verificar se usuário tem permissão para uma aba
  const hasTabPermission = (permission?: keyof UserPermissions): boolean => {
    if (!user) return false;
    // SUPER_ADMIN tem acesso a tudo
    const normalizedRole = user.role.replace(/^ROLE_/, '').toUpperCase();
    if (normalizedRole === 'SUPER_ADMIN') return true;

    // Se ALL_PERMISSIONS for true, tem acesso a tudo
    if (user.permissions?.ALL_PERMISSIONS) return true;

    if (!permission) return true;
    return !!user.permissions?.[permission];
  };

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
      <div className="max-w-7xl mx-auto px-4">
        <div className="space-y-6">
          <Tabs defaultValue="dashboard" className="w-full">
            {/* Tabs - Padrão SST Simplificado */}
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 bg-seguranca-graphite border-gray-600">
              {hasTabPermission('DASHBOARD_READ') && (
                <TabsTrigger value="dashboard" className="text-seguranca-lightgray data-[state='active']:bg-seguranca-red text-xs sm:text-sm">
                  Dashboard
                </TabsTrigger>
              )}
              {hasTabPermission('FINANCIAL_PAYABLE_READ') && (
                <TabsTrigger value="contas-pagar" className="text-seguranca-lightgray data-[state='active']:bg-seguranca-red text-xs sm:text-sm">
                  Contas a Pagar
                </TabsTrigger>
              )}
              {hasTabPermission('FINANCIAL_RECEIVABLE_READ') && (
                <TabsTrigger value="contas-receber" className="text-seguranca-lightgray data-[state='active']:bg-seguranca-red text-xs sm:text-sm">
                  Contas a Receber
                </TabsTrigger>
              )}
              {hasTabPermission('FINANCIAL_PAYABLE_WRITE') && (
                <TabsTrigger value="pagamentos" className="text-seguranca-lightgray data-[state='active']:bg-seguranca-red text-xs sm:text-sm">
                  Pagamentos
                </TabsTrigger>
              )}
              {hasTabPermission('FINANCIAL_READ') && (
                <TabsTrigger value="centro-custos" className="text-seguranca-lightgray data-[state='active']:bg-seguranca-red text-xs sm:text-sm">
                  Centro Custos
                </TabsTrigger>
              )}
              {hasTabPermission('FINANCIAL_INVOICE_READ') && (
                <TabsTrigger value="faturas" className="text-seguranca-lightgray data-[state='active']:bg-seguranca-red text-xs sm:text-sm">
                  Faturas
                </TabsTrigger>
              )}
              {hasTabPermission('FINANCIAL_MEASUREMENT_READ') && (
                <TabsTrigger value="medicoes" className="text-seguranca-lightgray data-[state='active']:bg-seguranca-red text-xs sm:text-sm">
                  Medições
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="dashboard" className="mt-6">
              <FinanceiroDashboard
                transactions={mockTransactions}
                invoices={mockInvoices}
                refreshData={() => {
                  toast({
                    title: "Atualizado",
                    description: "Dashboard atualizado com sucesso",
                  });
                }}
              />
            </TabsContent>

            <TabsContent value="contas-pagar">
              <ContasAPagar />
            </TabsContent>

            <TabsContent value="contas-receber">
              <ContasAReceber />
            </TabsContent>

            <TabsContent value="pagamentos">
              <PagamentosTab />
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
      </div>
    </StandardLayout>
  );
};

const Financeiro = FinanceiroSimple;
export default Financeiro;