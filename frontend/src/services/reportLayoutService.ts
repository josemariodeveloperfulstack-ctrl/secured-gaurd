import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Company } from '@/types/company';

export interface ReportConfig {
  title: string;
  filename: string;
  company?: Company;
  /** Quando true, o elemento já usa StandardReportTemplate com cabeçalho/rodapé. Evita duplicação. */
  elementHasFullLayout?: boolean;
  /** Orientação do relatório. Default: 'portrait' (Retrato). Se houver muitas colunas use 'landscape' (Paisagem) */
  orientation?: 'portrait' | 'landscape';
  /** Função para checar se o usuário cancelou o processamento */
  isCancelled?: () => boolean;
}

class ReportLayoutService {
  /**
   * Generates a PDF from a given HTML element using the premium layout standards.
   */
  async generatePremiumPDF(element: HTMLElement, config: ReportConfig): Promise<void> {
    try {
      if (config.isCancelled?.()) throw new Error('Processo cancelado pelo usuário');

      // 0. Auto-detect orientation if not provided
      let isLandscape = config.orientation === 'landscape';
      if (!config.orientation) {
        const thCount = element.querySelectorAll('th').length;
        isLandscape = thCount > 4;
      }

      const containerWidth = isLandscape ? '1122px' : '800px';
      const minHeight = isLandscape ? '700px' : '1100px';

      // 1. Create a temporary container to render the premium layout
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = containerWidth;
      container.style.backgroundColor = 'white';
      container.style.padding = '40px 20px 60px 20px'; // Space for header and footer
      container.style.fontFamily = 'Inter, sans-serif';

      if (config.elementHasFullLayout) {
        container.style.padding = '0';
        container.innerHTML = element.innerHTML;
      } else {
        const currentDate = new Date().toLocaleDateString('pt-BR');
        const currentTime = new Date().toLocaleTimeString('pt-BR');
        const header = this.buildHeaderHTML(config, currentDate);
        const footer = this.buildFooterHTML(config, currentDate, currentTime);
        container.innerHTML = `
        ${header}
        <div style="margin-top: 20px; min-height: ${minHeight}; space-y: 10px;">
          ${element.innerHTML}
        </div>
        ${footer}
      `;
      }

      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 1.2, // Reduzido de 1.5 para 1.2 para ganhar muita performance mantendo boa qualidade
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      container.remove();

      // 6. Create PDF - Usando JPEG que é muuuito mais rápido e leve que PNG para relatórios grandes
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const pdfOrientation = isLandscape ? 'l' : 'p';
      const pdf = new jsPDF(pdfOrientation, 'mm', 'a4');

      const pageWidth = isLandscape ? 297 : 210;
      const pageHeight = isLandscape ? 210 : 297;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Usando alias 'REPORT' para que o jsPDF reutilize a mesma imagem na memória
      // ao invés de embutir os bytes mastodônticos do Base64 10x no arquivo PDF
      pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, imgHeight, 'REPORT', 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        // Yield to the main thread to prevent the browser from freezing on large reports
        await new Promise(resolve => setTimeout(resolve, 5));

        if (config.isCancelled?.()) throw new Error('Processo cancelado pelo usuário');

        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage('REPORT', 'JPEG', 0, position, pageWidth, imgHeight, 'REPORT', 'FAST');
        heightLeft -= pageHeight;
      }

      // 7. Save
      pdf.save(config.filename || 'relatorio.pdf');
    } catch (error) {
      console.error('Error generating premium PDF:', error);
      throw error;
    }
  }

  private buildHeaderHTML(config: ReportConfig, date: string): string {
    const companyName = config.company?.name || 'Secured Guard';

    return `
      <div style="position: relative; margin-bottom: 20px; width: 100%; height: 150px; font-family: 'Inter', sans-serif;">
        <!-- Top Gradient Bar -->
        <div style="position: absolute; top: 0; left: 0; right: 0; height: 28px; background: linear-gradient(to right, #FFCC00, #FF9900, #FF3333); z-index: 0;"></div>
        
        <!-- Dark Curve Shape (Top-Left) using robust CSS for html2canvas -->
        <div style="position: absolute; top: 0; left: 0; background-color: #1e1e1e; width: 260px; height: 130px; border-bottom-right-radius: 90% 100%; z-index: 10;"></div>

        <!-- Logo Area -->
        <div style="position: absolute; top: 15px; left: 20px; width: 150px; height: 70px; z-index: 20; display: flex; align-items: center; justify-content: center;">
             <img src="/logo-sistema.png" style="max-height: 60px; max-width: 100%; object-fit: contain;" alt="Logo" />
        </div>

        <!-- Title Area -->
        <div style="position: absolute; top: 0; left: 260px; right: 0; height: 130px; z-index: 20; display: flex; flex-direction: column; align-items: flex-end; justify-content: center; padding-right: 20px; padding-top: 28px;">
            <h1 style="color: black; font-weight: 900; text-transform: uppercase; font-size: 26px; margin: 0; letter-spacing: -0.5px; text-align: right; line-height: 1.1;">
                ${config.title}
            </h1>
            <div style="display: flex; align-items: center; gap: 10px; margin-top: 12px; width: 100%; justify-content: flex-end;">
               <div style="height: 2px; width: 60px; background: linear-gradient(to right, #FF9900, #FF3333);"></div>
               <p style="color: #4b5563; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; font-size: 11px; margin: 0;">
                   ${companyName}
               </p>
            </div>
        </div>
      </div>
    `;
  }

  private buildFooterHTML(config: ReportConfig, date: string, time: string): string {
    const company = config.company;
    const address = company?.address || 'Endereço não informado';
    const email = company?.email || 'contato@securedguard.com.br';
    const phone = company?.phone || '';

    return `
      <div style="position: relative; margin-top: 40px; padding-top: 15px; font-family: 'Inter', sans-serif; z-index: 30;">
        <!-- Bottom Gradient Line -->
        <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: linear-gradient(to right, #FFCC00, #FF9900, #FF3333); z-index: 0;"></div>

        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #6b7280; padding-bottom: 12px; border-bottom: 1px solid #eee;">
            <div style="text-align: left; font-weight: 500;">
                <p style="margin: 0; padding-bottom: 2px; color: black; font-weight: bold; text-transform: uppercase; font-style: italic;">${company?.name || 'Secured Guard'}</p>
                <p style="margin: 0;">${email}</p>
            </div>
            <div style="text-align: right; font-weight: 500;">
                <p style="margin: 0; padding-bottom: 2px;">${address}</p>
                <p style="margin: 0;">${phone ? 'TEL: ' + phone : ''}</p>
            </div>
        </div>
        <div style="text-align: center; font-weight: bold; color: #9ca3af; margin-top: 8px;">
            GERADO EM ${date} AS ${time} | SECURED GUARD INTELLIGENCE
        </div>
      </div>
    `;
  }
}

export const reportLayoutService = new ReportLayoutService();
