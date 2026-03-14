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

const cellStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid #d1d5db',
  fontSize: '11px',
  lineHeight: 1.5,
  fontFamily: 'Inter, system-ui, sans-serif',
  whiteSpace: 'normal' as const,
  wordBreak: 'break-word' as const,
  overflowWrap: 'break-word',
  letterSpacing: 'normal',
  verticalAlign: 'top',
};

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
    <div style={{ width: '100%', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ marginBottom: 16, fontSize: 14, fontWeight: 700, color: '#111827' }}>
        <p style={{ margin: 0 }}>Total de funcionários: {employees.length}</p>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '20%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '30%' }} />
          <col style={{ width: '8%' }} />
        </colgroup>
        <thead>
          <tr style={{ backgroundColor: '#dc2626', color: 'white' }}>
            <th style={{ ...cellStyle, fontWeight: 700, textTransform: 'uppercase', textAlign: 'left', minWidth: 140 }}>Nome</th>
            <th style={{ ...cellStyle, fontWeight: 700, textTransform: 'uppercase', textAlign: 'left', width: 90 }}>Matrícula</th>
            <th style={{ ...cellStyle, fontWeight: 700, textTransform: 'uppercase', textAlign: 'left', minWidth: 160 }}>Cargo</th>
            <th style={{ ...cellStyle, fontWeight: 700, textTransform: 'uppercase', textAlign: 'left', minWidth: 100 }}>Posto</th>
            <th style={{ ...cellStyle, fontWeight: 700, textTransform: 'uppercase', textAlign: 'left', minWidth: 180 }}>Empresa</th>
            <th style={{ ...cellStyle, fontWeight: 700, textTransform: 'uppercase', textAlign: 'left', width: 80 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp, index) => (
            <tr key={emp.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
              <td style={cellStyle}>{emp.name || '-'}</td>
              <td style={cellStyle}>{emp.registrationNumber || '-'}</td>
              <td style={cellStyle}>{emp.position?.name || '-'}</td>
              <td style={cellStyle}>{getCurrentWorkPost(emp)}</td>
              <td style={cellStyle}>{emp.company?.name || emp.company?.sigla || '-'}</td>
              <td style={cellStyle}>
                {emp.status === 'ACTIVE' ? 'Ativo' : emp.status === 'TERMINATED' ? 'Demitido' : emp.status || '-'}
              </td>
            </tr>
          ))}
          {employees.length === 0 && (
            <tr>
              <td colSpan={6} style={{ ...cellStyle, padding: 16, textAlign: 'center', color: '#6b7280' }}>
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

  // Preload templates para html2canvas capturar
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
      img.src = '/report-background-template.png';
    })
  ]);

  const {
    reportTitle,
    employees,
    company,
    filename
  } = params;

  // Container visível na viewport — html2canvas precisa capturar elemento visível (opacity quebrava)
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '1122px';
  container.style.minHeight = '800px';
  container.style.backgroundColor = '#ffffff';
  container.style.zIndex = '99999';

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

    // Aguardar template e conteúdo renderizarem (html2canvas precisa que imagens estejam carregadas)
    await sleep(600);

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
