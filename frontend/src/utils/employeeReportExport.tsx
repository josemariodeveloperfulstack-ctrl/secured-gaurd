import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Company } from '@/types/company';
import { reportLayoutService } from '@/services/reportLayoutService';
import { StandardReportTemplate } from '@/components/reporting/StandardReportTemplate';
import { EmployeeWithDetails } from '@/components/operacional/OperationalEmployeesTab';

export interface EmployeeReportExportParams {
  reportTitle: string;
  employees: EmployeeWithDetails[];
  company?: Company;
  filename?: string;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const EmployeeReportPrintable: React.FC<{ employees: EmployeeWithDetails[] }> = ({ employees }) => {
          const getCurrentWorkPost = (emp: EmployeeWithDetails) => {
            if (emp.workPosts && emp.workPosts.length > 0) {
              return emp.workPosts.map(w => w.name).filter(Boolean).join(', ') || '-';
            }
            if (emp.workPost?.name) return emp.workPost.name;
            if (emp.department?.name) return emp.department.name;
            return '-';
          };

  return (
    <div className="w-full">
      <div className="mb-4 text-sm text-gray-600">
        <p><strong>Total de funcionários:</strong> {employees.length}</p>
      </div>
      
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-[#dc2626] text-white">
            <th className="p-2 border border-gray-300 font-bold uppercase">Nome</th>
            <th className="p-2 border border-gray-300 font-bold uppercase">Matrícula</th>
            <th className="p-2 border border-gray-300 font-bold uppercase">Cargo</th>
            <th className="p-2 border border-gray-300 font-bold uppercase">Posto</th>
            <th className="p-2 border border-gray-300 font-bold uppercase">Empresa</th>
            <th className="p-2 border border-gray-300 font-bold uppercase">Status</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp, index) => (
            <tr key={emp.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="p-2 border border-gray-300">{emp.name || '-'}</td>
              <td className="p-2 border border-gray-300">{emp.registrationNumber || '-'}</td>
              <td className="p-2 border border-gray-300">{emp.position?.name || '-'}</td>
              <td className="p-2 border border-gray-300">{getCurrentWorkPost(emp)}</td>
              <td className="p-2 border border-gray-300">{emp.company?.name || emp.company?.sigla || '-'}</td>
              <td className="p-2 border border-gray-300">
                {emp.status === 'ACTIVE' ? 'Ativo' : emp.status === 'TERMINATED' ? 'Demitido' : emp.status || '-'}
              </td>
            </tr>
          ))}
          {employees.length === 0 && (
            <tr>
              <td colSpan={6} className="p-4 text-center text-gray-500 border border-gray-300">
                Nenhum funcionário encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export async function generateEmployeeReportPDF(params: EmployeeReportExportParams): Promise<void> {
  if (typeof document === 'undefined') {
    throw new TypeError('Geração de PDF disponível apenas no ambiente do navegador.');
  }

  // Preload images to ensure html2canvas captures them
  await Promise.all([
    new Promise((resolve) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = resolve;
      img.src = '/report-background-landscape.jpg';
    }),
    new Promise((resolve) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = resolve;
      img.src = '/logo-sistema.png';
    })
  ]);

  const {
    reportTitle,
    employees,
    company,
    filename
  } = params;

  // Container oculto para renderizar o layout premium
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '1122px'; // Landscape width
  container.style.backgroundColor = '#ffffff';

  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    flushSync(() => {
      root.render(
        <StandardReportTemplate title={reportTitle} company={company} orientation="landscape">
          <EmployeeReportPrintable employees={employees} />
        </StandardReportTemplate>
      );
    });

    // Dar um tick para garantir que imagens e estilos foram aplicados
    await sleep(300);

    const normalizedTitle = reportTitle.trim().replace(/\s+/g, '_').toLowerCase();
    const effectiveFilename =
      filename || `${normalizedTitle}_${new Date().toISOString().split('T')[0]}.pdf`;

    await reportLayoutService.generatePremiumPDF(container, {
      title: reportTitle,
      filename: effectiveFilename,
      company,
      elementHasFullLayout: true,
      orientation: 'landscape'
    });
  } finally {
    try {
      root.unmount();
    } catch {
      // ignore
    }
    container.remove();
  }
}
