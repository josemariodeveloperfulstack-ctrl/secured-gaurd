import React from 'react';
import { Layout } from '@/components/Layout';
import InteractiveDashboard from '@/components/dashboard/InteractiveDashboard';
import { useAOS } from '@/hooks/use-aos';

const Dashboard = () => {
  const aos = useAOS();

  return (
    <Layout activePage="dashboard">
      <div data-aos={aos.fadeDown}>
        <InteractiveDashboard />
      </div>
    </Layout>
  );
};

export default Dashboard;
