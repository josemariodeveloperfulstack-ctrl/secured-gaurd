import React, { useEffect, useState } from 'react';
import { fetchCrmMetrics } from '../../services/crmService';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

const EMPTY_CRM_METRICS = {
  totalLeads: 0,
  activeOpportunities: 0,
  totalOpportunities: 0,
  totalProposals: 0,
  totalQuotes: 0,
  conversionRate: 0,
  estimatedRevenue: 0,
  totalValue: 0,
  monthlyCount: {} as Record<string, number>,
  statusHistory: {} as Record<string, Record<string, number>>,
};

export default function CrmDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await fetchCrmMetrics();
        setMetrics(data);
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } } };
        const msg =
          err?.response?.data?.message ||
          (e instanceof Error ? e.message : 'Não foi possível carregar as métricas.');
        setLoadError(msg);
        setMetrics({ ...EMPTY_CRM_METRICS });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading || !metrics) return <div>Carregando dashboard...</div>;

  // Cards
  const totalOpportunities = metrics.totalOpportunities;
  const totalValue = metrics.totalValue;
  const totalProposals = metrics.totalProposals || (metrics.opportunities ? metrics.opportunities.filter((o: any) => o.number || o.proposalNumber).length : 0);

  // Gráfico: Oportunidades por mês
  const monthlyLabels = Object.keys(metrics.monthlyCount);
  const monthlyData = Object.values(metrics.monthlyCount);
  const barData = {
    labels: monthlyLabels,
    datasets: [
      {
        label: 'Oportunidades',
        data: monthlyData,
        backgroundColor: '#ffd600',
      },
    ],
  };

  // Gráfico: Evolução de status (statusHistory: mês -> { STATUS: count })
  const statusLabels = monthlyLabels;
  const statusKeys = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST'];
  const statusDatasets = statusKeys.map((statusKey, idx) => ({
    label: statusKey,
    data: statusLabels.map((monthLabel: string) => {
      const byMonth = metrics.statusHistory?.[monthLabel];
      return byMonth && typeof byMonth[statusKey] === 'number' ? byMonth[statusKey] : 0;
    }),
    borderColor: ['#ffd600', '#10b981', '#3b82f6', '#8b5cf6', '#f97316', '#22c55e', '#ef4444'][idx % 7],
    backgroundColor: 'transparent',
    tension: 0.3,
  }));
  const lineData = {
    labels: statusLabels,
    datasets: statusDatasets,
  };

  return (
    <div style={{ padding: 12, maxWidth: 1200, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 24, fontSize: 22 }}>Dashboard CRM</h2>
      {loadError && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            background: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #fecaca',
          }}
        >
          {loadError}
        </div>
      )}
      {/* Cards de Métricas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px #0001', borderLeft: '4px solid #ffd600', minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 13, color: '#666' }}>Total de Oportunidades</h3>
          <div style={{ fontSize: 26, fontWeight: 'bold', color: '#333' }}>{totalOpportunities}</div>
        </div>
        <div style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px #0001', borderLeft: '4px solid #10b981', minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 13, color: '#666' }}>Valor Total</h3>
          <div style={{ fontSize: 26, fontWeight: 'bold', color: '#333' }}>
            R$ {totalValue.toLocaleString('pt-BR')}
          </div>
        </div>
        <div style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px #0001', borderLeft: '4px solid #3b82f6', minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 13, color: '#666' }}>Total de Propostas</h3>
          <div style={{ fontSize: 26, fontWeight: 'bold', color: '#333' }}>{totalProposals}</div>
        </div>
      </div>
      {/* Gráfico de Oportunidades por Mês */}
      <div style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px #0001', marginBottom: 24 }}>
        <h3 style={{ margin: 0, marginBottom: 12, fontSize: 16 }}>Oportunidades por Mês</h3>
        <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
      </div>
      {/* Gráfico de Evolução de Status */}
      <div style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px #0001' }}>
        <h3 style={{ margin: 0, marginBottom: 12, fontSize: 16 }}>Evolução de Status (últimos 12 meses)</h3>
        <Line data={lineData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
      </div>
    </div>
  );
} 