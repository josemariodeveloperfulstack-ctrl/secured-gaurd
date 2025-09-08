import { ShiftChangeFormDTO } from '@/services/shiftChangeService';

export interface PDFTemplateData {
  companyName?: string;
  companyLogo?: string;
  documentTitle: string;
  documentNumber: string;
  date: string;
  data: any;
}

class PDFService {
  private generateShiftChangePDFContent(shiftChange: ShiftChangeFormDTO): string {
    const shiftTimeLabels = {
      'SHIFT_6H_18H': '6h às 18h',
      'SHIFT_18H_6H': '18h às 6h',
      'SHIFT_7H_19H': '7h às 19h',
      'SHIFT_19H_7H': '19h às 7h'
    };

    const formatDate = (dateString: string) => {
      if (!dateString) return 'Não informado';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
      } catch {
        return 'Data inválida';
      }
    };

    const getStatusText = (status: string) => {
      switch (status) {
        case 'PENDING': return 'PENDENTE';
        case 'APPROVED': return 'APROVADO';
        case 'REJECTED': return 'REJEITADO';
        default: return 'DESCONHECIDO';
      }
    };

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Solicitação de Troca de Plantão</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: white;
            color: #333;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #1a1a1a;
            margin-bottom: 5px;
          }
          .document-title {
            font-size: 20px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
          }
          .document-info {
            font-size: 14px;
            color: #666;
          }
          .section {
            margin-bottom: 30px;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #1a1a1a;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
            margin-bottom: 15px;
          }
          .data-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
          }
          .data-item {
            margin-bottom: 10px;
          }
          .data-label {
            font-weight: bold;
            color: #555;
            font-size: 12px;
            text-transform: uppercase;
          }
          .data-value {
            font-size: 14px;
            color: #333;
            margin-top: 2px;
          }
          .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .status-pending {
            background-color: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
          }
          .status-approved {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
          }
          .status-rejected {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 20px;
          }
          .signature-section {
            margin-top: 40px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
          }
          .signature-box {
            text-align: center;
            border-top: 1px solid #333;
            padding-top: 10px;
            margin-top: 20px;
          }
          .signature-label {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">SECURED GUARD</div>
          <div class="document-title">SOLICITAÇÃO DE TROCA DE PLANTÃO</div>
          <div class="document-info">
            Documento: #${shiftChange.id || 'N/A'} | Data: ${formatDate(shiftChange.dateOfRequest)}
          </div>
        </div>

        <div class="section">
          <div class="section-title">DADOS DO SOLICITANTE</div>
          <div class="data-grid">
            <div class="data-item">
              <div class="data-label">Nome Completo</div>
              <div class="data-value">${shiftChange.requesterFullName}</div>
            </div>
            <div class="data-item">
              <div class="data-label">Setor</div>
              <div class="data-value">${shiftChange.requesterSector}</div>
            </div>
            <div class="data-item">
              <div class="data-label">Data do Plantão</div>
              <div class="data-value">${formatDate(shiftChange.requesterShiftDate)}</div>
            </div>
            <div class="data-item">
              <div class="data-label">Data da Folga</div>
              <div class="data-value">${shiftChange.requesterDayOffDate ? formatDate(shiftChange.requesterDayOffDate) : 'Não informado'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">DADOS DO COLEGA</div>
          <div class="data-grid">
            <div class="data-item">
              <div class="data-label">Nome Completo</div>
              <div class="data-value">${shiftChange.replacingFullName}</div>
            </div>
            <div class="data-item">
              <div class="data-label">Setor</div>
              <div class="data-value">${shiftChange.replacingSector}</div>
            </div>
            <div class="data-item">
              <div class="data-label">Data do Plantão</div>
              <div class="data-value">${formatDate(shiftChange.replacingShiftDate)}</div>
            </div>
            <div class="data-item">
              <div class="data-label">Data da Folga</div>
              <div class="data-value">${shiftChange.replacingDayOffDate ? formatDate(shiftChange.replacingDayOffDate) : 'Não informado'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">INFORMAÇÕES DO PLANTÃO</div>
          <div class="data-grid">
            <div class="data-item">
              <div class="data-label">Horário do Plantão</div>
              <div class="data-value">${shiftTimeLabels[shiftChange.shiftTime] || shiftChange.shiftTime}</div>
            </div>
            <div class="data-item">
              <div class="data-label">Status da Solicitação</div>
              <div class="data-value">
                <span class="status-badge status-${(shiftChange.status || 'PENDING').toLowerCase()}">
                  ${getStatusText(shiftChange.status || 'PENDING')}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-label">Assinatura do Solicitante</div>
          </div>
          <div class="signature-box">
            <div class="signature-label">Assinatura do Responsável</div>
          </div>
        </div>

        <div class="footer">
          <p>Documento gerado automaticamente pelo sistema Secured Guard</p>
          <p>Data de geração: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
        </div>
      </body>
      </html>
    `;
  }

  async generateShiftChangePDF(shiftChange: ShiftChangeFormDTO): Promise<Blob> {
    try {
      const htmlContent = this.generateShiftChangePDFContent(shiftChange);
      
      // Criar um blob com o conteúdo HTML
      const blob = new Blob([htmlContent], { type: 'text/html' });
      
      // Para uma implementação real de PDF, você usaria uma biblioteca como jsPDF ou html2pdf
      // Por enquanto, vamos retornar o HTML como um arquivo que pode ser convertido
      return blob;
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      throw new Error('Falha ao gerar PDF da troca de plantão');
    }
  }

  async downloadShiftChangePDF(shiftChange: ShiftChangeFormDTO, filename?: string): Promise<void> {
    try {
      const blob = await this.generateShiftChangePDF(shiftChange);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `troca-plantao-${shiftChange.id || 'documento'}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao fazer download do PDF:', error);
      throw error;
    }
  }
}

export default new PDFService();