import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Company } from '@/types/company';

export interface ReportConfig {
    title: string;
    filename: string;
    company?: Company;
    /** Quando true, o elemento já usa StandardReportTemplate com cabeçalho/rodapé. Evita duplicação. */
    elementHasFullLayout?: boolean;
}

class ReportLayoutService {
    /**
     * Generates a PDF from a given HTML element using the premium layout standards.
     */
    async generatePremiumPDF(element: HTMLElement, config: ReportConfig): Promise<void> {
        try {
            // 1. Create a temporary container to render the premium layout
            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.top = '-9999px';
            container.style.width = '800px';
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
        <div style="margin-top: 20px; min-height: 800px;">
          ${element.innerHTML}
        </div>
        ${footer}
      `;
            }

            document.body.appendChild(container);

            const canvas = await html2canvas(container, {
                scale: 1.5,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false
            });

            container.remove();

            // 6. Create PDF
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');

            const imgWidth = 210;
            const pageHeight = 295;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
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
      <div style="position: relative; margin-bottom: 40px; border-bottom: 4px solid transparent; width: 100%;">
        <!-- Gradient Bar -->
        <div style="height: 30px; width: 100%; background: linear-gradient(to right, #FFCC00, #FF9900, #FF3333);"></div>
        
        <!-- Curved Logo Area (Simulated) -->
        <div style="position: absolute; top: 0; left: 0; height: 80px; width: 150px; background-color: #1a1a1a; border-bottom-right-radius: 50px; display: flex; align-items: center; justify-content: center; z-index: 10;">
          <img src="/logo-sistema.png" style="max-width: 100px; max-height: 50px;" alt="Logo" />
        </div>

        <!-- Title Area -->
        <div style="text-align: center; margin-top: 40px; padding-top: 10px;">
          <h1 style="color: #1a1a1a; margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase;">${config.title}</h1>
          <p style="color: #666; margin: 5px 0; font-size: 12px; font-weight: 500;">${companyName} | Relatório Oficial</p>
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
      <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 15px; text-align: center; color: #666; font-size: 10px;">
        <p style="margin: 2px 0; font-weight: bold; color: #333;">${company?.name || 'Secured Guard'}</p>
        <p style="margin: 2px 0;">${address}${phone ? ` | Tel: ${phone}` : ''}</p>
        <p style="margin: 2px 0;">${email}</p>
        <div style="margin-top: 10px; display: flex; justify-content: space-between; border-top: 4px solid transparent;">
           <div style="height: 4px; width: 100%; background: linear-gradient(to right, #FFCC00, #FF9900, #FF3333);"></div>
        </div>
        <p style="margin-top: 5px; color: #999;">Gerado automaticamente em ${date} às ${time} pelo Sistema Secured Guard</p>
      </div>
    `;
    }
}

export const reportLayoutService = new ReportLayoutService();
