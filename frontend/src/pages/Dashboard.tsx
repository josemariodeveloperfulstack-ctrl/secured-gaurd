import React from 'react';
import { Layout } from '@/components/Layout';
import InteractiveDashboard from '@/components/dashboard/InteractiveDashboard';
import { useGSAP } from '@/hooks/use-gsap';

const Dashboard = () => {
  useGSAP();

  return (
    <Layout activePage="dashboard">
      <div data-animate="fadeDown">
        <InteractiveDashboard />
      </div>
    </Layout>
  );
};

export default Dashboard;
