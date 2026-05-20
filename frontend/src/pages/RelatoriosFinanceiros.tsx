import React, { useCallback, useEffect, useState } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { FinanceiroRelatorios } from '@/components/financeiro/FinanceiroRelatorios';
import { financialService, FinancialTransaction, Invoice } from '@/services/financialService';
import { contasAReceberService, ContaAReceber } from '@/services/contasAReceberService';

function toIsoDate(d: Date | string | undefined | null): string {
  if (d == null) return new Date().toISOString();
  if (d instanceof Date) return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  const parsed = new Date(d);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

/** Contas a receber da API viram linhas de receita no relatório (o módulo não usava isso antes). */
function contasReceberToIncomeTransactions(contas: ContaAReceber[]): FinancialTransaction[] {
  if (!Array.isArray(contas)) return [];
  return contas.map((c) => {
    const statusMap: Record<string, FinancialTransaction['status']> = {
      ABERTA: 'PENDING',
      RECEBIDA: 'PAGA',
      VENCIDA: 'PENDENTE',
      CANCELADA: 'CANCELADA',
    };
    const st = (c.status && statusMap[c.status]) || 'PENDING';
    const issue = c.dataEmissao ?? c.vencimento ?? c.dueDate;
    const due = c.vencimento ?? c.dueDate ?? c.dataEmissao;
    return {
      id: `ar-${c.id}`,
      type: 'INCOME',
      category: c.categoria || 'Receita',
      description: c.descricao || c.description || '',
      amount: Number(c.amount ?? c.valor ?? 0),
      date: toIsoDate(issue as Date | string | undefined),
      dueDate: due ? toIsoDate(due as Date | string | undefined) : undefined,
      status: st,
      reference: c.invoiceNumber || c.numeroFatura,
      notes: c.observacoes,
      createdAt: toIsoDate(issue as Date | string | undefined),
      updatedAt: toIsoDate(issue as Date | string | undefined),
      unitId:
        c.empresaId != null
          ? String(c.empresaId)
          : c.clienteId
            ? String(c.clienteId)
            : c.client?.id
              ? String(c.client.id)
              : undefined,
      unit:
        c.empresaId != null
          ? { id: String(c.empresaId), name: c.empresa || '' }
          : c.clienteId
            ? { id: String(c.clienteId), name: c.client?.name || c.cliente || '' }
            : c.client?.id
              ? { id: String(c.client.id), name: c.client.name || '' }
              : undefined,
      costCenter: c.centroCusto || undefined,
    };
  });
}

/** Mesmos dados da página dedicada — reutilizável na aba “Relatórios” do módulo financeiro */
export function FinanceiroRelatoriosComDados() {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const load = useCallback(async () => {
    const [t, i, ar] = await Promise.all([
      financialService.getTransactions().catch((err) => {
        console.error('Relatórios: falha ao carregar transações financeiras', err);
        return [] as FinancialTransaction[];
      }),
      financialService.getAllInvoices().catch((err) => {
        console.error('Relatórios: falha ao carregar faturas (invoices/all)', err);
        return [] as Invoice[];
      }),
      contasAReceberService.getAllContasAReceber().catch((err) => {
        console.error('Relatórios: falha ao carregar contas a receber (all)', err);
        return [] as ContaAReceber[];
      }),
    ]);
    const incomeFromReceivables = contasReceberToIncomeTransactions(Array.isArray(ar) ? ar : []);
    const tx = Array.isArray(t) ? t : [];
    const inv = Array.isArray(i) ? i : [];
    console.info('[Relatórios financeiros] registros carregados', {
      transacoes: tx.length,
      faturasDespesas: inv.length,
      contasReceber: incomeFromReceivables.length,
    });
    setTransactions([...tx, ...incomeFromReceivables]);
    setInvoices(inv);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return <FinanceiroRelatorios transactions={transactions} invoices={invoices} refreshData={load} />;
}

const RelatoriosFinanceiros: React.FC = () => {
  return (
    <StandardLayout>
      <div className="container mx-auto p-6">
        <FinanceiroRelatoriosComDados />
      </div>
    </StandardLayout>
  );
};

export default RelatoriosFinanceiros;
